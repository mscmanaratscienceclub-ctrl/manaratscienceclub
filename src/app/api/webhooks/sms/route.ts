import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { stemfestPaymentSms, stemfestRegistrations } from "@/db/schema";
import { parsePaymentSms } from "@/lib/sms/parser";
import { eq, sql } from "drizzle-orm";

const smsPayloadSchema = z.object({
  clientMessageId: z.string().optional(),
  sender: z.string().trim().min(1, "Sender is required"),
  body: z.string().trim().min(1, "Message body is required"),
  receivedAt: z.string().optional(),
});

/**
 * Ping / Healthcheck for the Android forwarder app
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-forwarder-secret");
  const expected = process.env.SMS_FORWARDER_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    service: "MSC STEM Fest SMS Forwarder Webhook",
    authenticated: Boolean(expected && secret === expected),
  });
}

/**
 * Ingests forwarded SMS from the Android device, parses payment information,
 * records it, and automatically reconciles with stem_fest_registrations.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-forwarder-secret");
  const expected = process.env.SMS_FORWARDER_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedPayload = smsPayloadSchema.safeParse(json);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid payload format", details: parsedPayload.error.flatten() },
      { status: 400 }
    );
  }

  const { clientMessageId, sender, body, receivedAt } = parsedPayload.data;

  // 1. Idempotency check: if clientMessageId already recorded, return success immediately
  if (clientMessageId) {
    const existing = await db
      .select({ id: stemfestPaymentSms.id, status: stemfestPaymentSms.status })
      .from(stemfestPaymentSms)
      .where(eq(stemfestPaymentSms.clientMessageId, clientMessageId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: "SMS already processed",
        id: existing[0].id,
        status: existing[0].status,
      });
    }
  }

  // 2. Parse SMS body (extracts TrxID, amount, sender number)
  const parsedSms = parsePaymentSms(body);

  let status = "unmatched";
  let matchedRegistrationId: string | null = null;

  // 3. If a Transaction ID was found, check for a matching registration
  if (parsedSms.transactionId) {
    const [matchingReg] = await db
      .select({ id: stemfestRegistrations.id })
      .from(stemfestRegistrations)
      .where(
        sql`upper(${stemfestRegistrations.transactionId}) = ${parsedSms.transactionId}`
      )
      .limit(1);

    if (matchingReg) {
      status = "matched";
      matchedRegistrationId = matchingReg.id;
    }
  } else if (!parsedSms.isPaymentNotification) {
    status = "ignored";
  }

  // 4. Save the SMS record into stem_fest_payment_sms
  const [record] = await db
    .insert(stemfestPaymentSms)
    .values({
      clientMessageId: clientMessageId || null,
      sender,
      rawMessage: body,
      transactionId: parsedSms.transactionId,
      amount: parsedSms.amount ? String(parsedSms.amount) : null,
      senderNumber: parsedSms.senderNumber,
      status,
      matchedRegistrationId,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
    })
    .returning({
      id: stemfestPaymentSms.id,
      status: stemfestPaymentSms.status,
    });

  return NextResponse.json({
    success: true,
    id: record.id,
    status: record.status,
    matched: status === "matched",
    matchedRegistrationId,
    parsed: {
      transactionId: parsedSms.transactionId,
      amount: parsedSms.amount,
      senderNumber: parsedSms.senderNumber,
    },
  });
}

