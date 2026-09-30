/**
 * Replay bKash payment SMS through the club's own ingest pipeline.
 *
 * Reads messages from stdin and POSTs each to /api/webhooks/sms with the
 * forwarder secret from .env, so parsing, TrxID reconciliation and idempotency
 * are exactly what the Android forwarder triggers in production. Use it when
 * the forwarder app misses messages (phone offline, app reinstallled) and the
 * club pastes the SMS text instead.
 *
 * Input: the pasted SMS text, one message per "You have received" block, e.g.
 *
 *   You have received Tk 200.00 from 01924923090. Fee Tk 0.00. Balance
 *   Tk 5,695.00. TrxID DIP4V9GEHC at 25/09/2026 18:44
 *
 * The `at dd/mm/yyyy hh:mm` timestamp is read as Bangladesh time (+06:00),
 * which is what the phone clocks show. Messages without one are ingested with
 * the current time. Safe to re-run: each message gets a stable
 * `clientMessageId` derived from its TrxID, and the webhook dedupes on it.
 *
 * Usage: node --env-file=.env scripts/replay-payment-sms.mjs [baseUrl] < sms.txt
 *        (baseUrl defaults to http://localhost:3000 — pass the dev port; the
 *        production deployment's URL works too, and is the point when the
 *        forwarder is down but the site is up)
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

const secret = process.env.SMS_FORWARDER_SECRET;
if (!secret) {
  console.error("SMS_FORWARDER_SECRET is not set in the environment");
  process.exit(1);
}

const stdin = await new Promise((resolve) => {
  let text = "";
  if (process.stdin.isTTY) return resolve(text);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (text += chunk));
  process.stdin.on("end", () => resolve(text));
});

/** "at 25/09/2026 18:44" → ISO instant in Bangladesh time (+06:00). */
function receivedAtFor(body) {
  const match = body.match(/at\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:00+06:00`;
  return Number.isNaN(new Date(iso).getTime()) ? undefined : iso;
}

/** One message per "You have received" block; newlines inside a block collapse. */
function splitMessages(text) {
  const starts = [...text.matchAll(/You have received\b/g)].map((m) => m.index);
  if (starts.length === 0) return [];
  const blocks = starts.map((start, i) =>
    text.slice(start, i + 1 < starts.length ? starts[i + 1] : undefined).trim(),
  );
  return blocks.map((body) => ({ body, receivedAt: receivedAtFor(body) }));
}

const messages = splitMessages(stdin);
if (messages.length === 0) {
  console.error(
    "No messages on stdin — paste the bKash SMS text, one per 'You have received' block.",
  );
  process.exit(1);
}

let failures = 0;

for (const { body, receivedAt } of messages) {
  // Stable per TrxID, so a re-run of the same paste is recognised by the
  // webhook's unique constraint, not inserted twice.
  const trx = body.match(/TrxID\s+([A-Za-z0-9]+)/i)?.[1]?.toUpperCase();
  const clientMessageId = trx ? `manual-replay:${trx}` : undefined;

  const response = await fetch(`${BASE_URL}/api/webhooks/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarder-secret": secret,
    },
    body: JSON.stringify({ clientMessageId, sender: "bkash", body, receivedAt }),
  });

  const payload = await response.json().catch(() => null);
  const label = trx ?? "(no TrxID)";

  if (!response.ok) {
    failures += 1;
    console.error(`${label}  HTTP ${response.status}  ${JSON.stringify(payload)}`);
    continue;
  }

  const duplicate = payload.message === "SMS already processed";
  console.log(
    `${label}  status=${payload.status}  matched=${payload.matched}${duplicate ? "  (already on file)" : "  (inserted)"}`,
  );
}

console.log(
  failures === 0
    ? `\n${messages.length} message(s) processed.`
    : `\n${failures} of ${messages.length} message(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
