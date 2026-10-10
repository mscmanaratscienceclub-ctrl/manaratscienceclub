import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { withDbTimeout } from "@/db/query";
import { stemfestPaymentSms, stemfestRegistrations } from "@/db/schema";
import { parsePaymentSms } from "@/lib/sms/parser";
import { captureException, captureMessage } from "@/lib/sentry-helpers";
import { eq, sql } from "drizzle-orm";

/**
 * Shared-secret header the Android forwarder app must send. Configure the same
 * value as `SMS_FORWARDER_SECRET` in the app's HTTP-header field.
 */
const SECRET_HEADER = "x-forwarder-secret";

// Answer every call fresh. The forwarder retries the *same* request until it gets a verdict, so a
// cached 401 (or a cached "ok") would be read as that verdict — and a cached answer is the one
// thing that makes a retry look like it ran when nothing did.
export const dynamic = "force-dynamic";

// `node:crypto` and the Postgres driver both need the Node runtime. Route handlers default to it,
// but the way that breaks if it ever changes is a confusing build error, so it is pinned here.
export const runtime = "nodejs";

/**
 * A missing `SMS_FORWARDER_SECRET` is reported once per process, at error level:
 * the endpoint now rejects everything until it is set, so the forwarded payment
 * SMS queue on the device grows until someone fixes the environment.
 */
let reportedMissingSecret = false;

function reportMissingSecret(): void {
  if (reportedMissingSecret) return;
  reportedMissingSecret = true;

  const warning =
    "SMS_FORWARDER_SECRET is not set — /api/webhooks/sms is answering every caller " +
    "with 503 and ingesting nothing. Set it in this environment and redeploy; " +
    "forwarded payment SMS stay queued on the device until then.";

  console.error(
    `\n${"=".repeat(70)}\n  [SMS WEBHOOK] ${warning}\n${"=".repeat(70)}\n`,
  );
  captureMessage(`[SMS webhook] ${warning}`, "error");
}

/**
 * Constant-time compare. `timingSafeEqual` throws on unequal lengths, so the
 * length check is a precondition guard rather than a second comparison; the
 * secret's length is not what needs protecting.
 */
function secretsMatch(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies the forwarder's shared secret, failing **closed**. Returns `null` when
 * the caller is authorised, otherwise the response the handler should return.
 *
 * Failing open here is not a logging nuisance. An accepted forgery is stored with
 * `status = "matched"`, and `stemfestEffectivePaymentStatus()`
 * (`src/db/queries/stemfest-payment.ts`) turns a match into a **verified** payment
 * for any registration no admin has adjudicated — free entry with no bKash
 * transaction behind it, and it lands in the payment-confirmed email audience.
 *
 * Misconfiguration answers 503 rather than 401 on purpose. The forwarder parks a
 * message as failed on 401, so rejecting with 401 while the variable is missing
 * would discard real payment SMS; 503 is retryable — the same status the ingest
 * below uses for a lost database — so the message stays queued until the variable
 * is set. A *wrong* secret still answers 401, because only the phone's
 * HTTP-header field can fix that and retrying cannot.
 */
function verifyForwarderSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.SMS_FORWARDER_SECRET;

  if (!expected) {
    reportMissingSecret();
    return NextResponse.json(
      { error: "SMS log temporarily unavailable" },
      { status: 503 },
    );
  }

  const supplied = request.headers.get(SECRET_HEADER);
  if (supplied && secretsMatch(supplied, expected)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const smsPayloadSchema = z.object({
  clientMessageId: z.string().trim().min(1).optional(),
  sender: z.string().trim().min(1, "Sender is required"),
  body: z.string().trim().min(1, "Message body is required"),
  receivedAt: z.string().optional(),
});

/**
 * The forwarder does not always stamp a message id. Without one, any retry — the
 * app's own, or a replay of a backlog queued while the phone was offline — would
 * insert the same SMS again, because `client_message_id` is the only dedupe key
 * (UNIQUE constraint). Derive a stable id from the payload instead: the same SMS
 * delivered twice with the same timestamp resolves to the same id, so the second
 * delivery is recognised as a duplicate instead of a second row.
 */
function deriveClientMessageId(
  sender: string,
  body: string,
  receivedAt?: string,
): string {
  const digest = createHash("sha256")
    .update(`${sender}\u0000${body}\u0000${receivedAt ?? ""}`)
    .digest("hex")
    .slice(0, 40);
  return `derived:${digest}`;
}

/**
 * Ping / Healthcheck for the Android forwarder app.
 *
 * Open this URL from the phone, with the secret header, before blaming the POST:
 * a `{"status":"ok"}` proves DNS, TLS, routing and the secret are all correct.
 * The check now fails closed, so `ok` is only ever returned for an authenticated
 * caller — `authenticated` is kept in the payload for the app that reads it.
 */
export async function GET(request: NextRequest) {
  const rejected = verifyForwarderSecret(request);
  if (rejected) return rejected;

  return NextResponse.json({
    status: "ok",
    service: "MSC STEM Fest SMS Forwarder Webhook",
    authenticated: true,
  });
}

/** What the ingest returns for one forwarded SMS, whoever stored it. */
interface IngestResult {
  id: string | null;
  status: string;
  matchedRegistrationId: string | null;
  duplicate: boolean;
}

/**
 * Ingests one forwarded SMS from the Android device: parses the payment details,
 * reconciles the TrxID against `stem_fest_registrations`, and records the message.
 *
 * Everything the request needs from the database runs inside one
 * `withDbTimeout()` transaction, and that is not decoration. This project has
 * *measured* the Supavisor pooler losing a response outright — the backend goes
 * `state = idle` with the statement finished, so nothing server-side can ever
 * time it out and the request waits forever (see `src/db/index.ts`). An unwrapped
 * query here is exactly what makes the forwarder report "connection timed out"
 * and retry; the wrapper adds a statement timeout, a client-side watchdog and one
 * retry, and the retry is safe because the ingest is idempotent.
 */
export async function POST(request: NextRequest) {
  const rejected = verifyForwarderSecret(request);
  if (rejected) return rejected;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedPayload = smsPayloadSchema.safeParse(json);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid payload format",
        details: parsedPayload.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { clientMessageId: suppliedId, sender, body, receivedAt } =
    parsedPayload.data;
  const clientMessageId =
    suppliedId ?? deriveClientMessageId(sender, body, receivedAt);
  const receivedAtDate = receivedAt ? new Date(receivedAt) : new Date();

  // Parsing the SMS is pure work — it has no business inside the transaction.
  const parsedSms = parsePaymentSms(body);

  try {
    const result = await withDbTimeout<IngestResult>(
      "smsWebhookIngest",
      async (tx) => {
        // 1. Idempotency: a message already on record is a success, not an
        //    error — the forwarder is allowed (and expected) to retry.
        const [existing] = await tx
          .select({
            id: stemfestPaymentSms.id,
            status: stemfestPaymentSms.status,
            matchedRegistrationId: stemfestPaymentSms.matchedRegistrationId,
          })
          .from(stemfestPaymentSms)
          .where(eq(stemfestPaymentSms.clientMessageId, clientMessageId))
          .limit(1);

        if (existing) return { ...existing, duplicate: true };

        // 2. Reconcile: does a registration already carry this TrxID?
        let status = "unmatched";
        let matchedRegistrationId: string | null = null;

        if (parsedSms.transactionId) {
          const [matchingReg] = await tx
            .select({ id: stemfestRegistrations.id })
            .from(stemfestRegistrations)
            .where(
              sql`upper(${stemfestRegistrations.transactionId}) = ${parsedSms.transactionId}`,
            )
            .limit(1);

          if (matchingReg) {
            status = "matched";
            matchedRegistrationId = matchingReg.id;
          }
        } else if (!parsedSms.isPaymentNotification) {
          status = "ignored";
        }

        // 3. Record it. `onConflictDoNothing` covers the concurrent case: if a
        //    first attempt committed but its response was lost, the retry loses
        //    the unique race rather than throwing.
        const [record] = await tx
          .insert(stemfestPaymentSms)
          .values({
            clientMessageId,
            sender,
            rawMessage: body,
            transactionId: parsedSms.transactionId,
            amount: parsedSms.amount ? String(parsedSms.amount) : null,
            senderNumber: parsedSms.senderNumber,
            status,
            matchedRegistrationId,
            receivedAt: receivedAtDate,
          })
          .onConflictDoNothing({ target: stemfestPaymentSms.clientMessageId })
          .returning({
            id: stemfestPaymentSms.id,
            status: stemfestPaymentSms.status,
            matchedRegistrationId: stemfestPaymentSms.matchedRegistrationId,
          });

        if (record) return { ...record, duplicate: false };

        // Lost the race — read back whoever won it.
        const [won] = await tx
          .select({
            id: stemfestPaymentSms.id,
            status: stemfestPaymentSms.status,
            matchedRegistrationId: stemfestPaymentSms.matchedRegistrationId,
          })
          .from(stemfestPaymentSms)
          .where(eq(stemfestPaymentSms.clientMessageId, clientMessageId))
          .limit(1);

        return {
          id: won?.id ?? null,
          status: won?.status ?? status,
          matchedRegistrationId:
            won?.matchedRegistrationId ?? matchedRegistrationId,
          duplicate: true,
        };
      },
    );

    return NextResponse.json({
      success: true,
      ...(result.duplicate ? { message: "SMS already processed" } : {}),
      id: result.id,
      status: result.status,
      matched: result.status === "matched",
      matchedRegistrationId: result.matchedRegistrationId,
      parsed: {
        transactionId: parsedSms.transactionId,
        amount: parsedSms.amount,
        senderNumber: parsedSms.senderNumber,
      },
    });
  } catch (error) {
    // Answer with a retryable status instead of a bare 500, and report it — a
    // failed ingest is the difference between a payment being verifiable or not.
    captureException(error, { webhook: "sms", clientMessageId, sender });
    return NextResponse.json(
      { error: "SMS log temporarily unavailable" },
      { status: 503 },
    );
  }
}

