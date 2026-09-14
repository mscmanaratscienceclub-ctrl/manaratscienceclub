---
tags: [backend, integration, sms, wip]
updated: 2026-09-14
---

# SMS Forwarder — bKash payment verification

How a bKash/Nagad payment confirmation SMS on the club's phone becomes a verified
STEM Fest registration. Related: [[api-architecture]] ·
[[environment-variables]] · [[database-supabase]].

## What it is, in one line

An **Android "SMS forwarder" app** on the phone that holds the bKash number POSTs
every incoming SMS to this app's webhook; the webhook extracts the TrxID and
amount, matches it against registrations, and stores the result for the admin
team to see.

There is **no SMS-sending** here, and no SMS provider (no Twilio/Vonage/etc.).
Nothing is ever sent to a phone — messages are only read off the club's own SIM.

## The pieces

| Piece | Where |
|-------|-------|
| Android forwarder app | **Not in this repo** — an `android app/` project in the workspace, and not version-controlled at all. Configured by hand on the phone (see below); it owns the SMS queue that the webhook must never be allowed to destroy (ADR-0028) |
| Shared secret | `SMS_FORWARDER_SECRET` (server-only env var), sent as the `x-forwarder-secret` header |
| Webhook | `src/app/api/webhooks/sms/route.ts` — `GET` ping + `POST` ingest |
| Parser | `src/lib/sms/parser.ts` — TrxID / amount / sender-number regexes for bKash, Nagad, Rocket, Upay |
| Storage | `stem_fest_payment_sms` (`src/db/schema/stemfest-payment-sms.ts`, DDL in `drizzle/create_stemfest_payment_sms.sql`) |
| Matching table | `stem_fest_registrations.transaction_id` |
| Admin view | `/admin/sms-logs` — total / matched / unmatched / ignored, searchable, paginated |
| Reverse reconcile | `src/app/(routes)/(site)/stemfestreg/actions.ts` — when a student submits the form, any earlier *unmatched* SMS with the same TrxID is linked to the new registration |

## Flow

```
bKash SMS → phone (forwarder app) → POST /api/webhooks/sms
                                        │  header: x-forwarder-secret
                                        ▼
                          parsePaymentSms()  →  TrxID, amount, sender number
                                        │
                                        ▼
              upper(stem_fest_registrations.transaction_id) = TrxID ?
                        │ yes                        │ no
                   status = matched            status = unmatched
                        │                           │ (or "ignored" when the
                        └─────────┬─────────────────┘  body is not a payment SMS)
                                  ▼
                       insert into stem_fest_payment_sms
```

Either direction can arrive first. The webhook marks a **matched** SMS when the
student has already registered; if the SMS lands first, the registration submit
back-links it. Both paths key on the TrxID upper-cased.

## Endpoint contract

`POST /api/webhooks/sms` · `Content-Type: application/json` ·
`x-forwarder-secret: <SMS_FORWARDER_SECRET>`

```json
{
  "clientMessageId": "optional-stable-id-from-the-app",
  "sender": "bkash",
  "body": "You have received Tk 500.00 from 01712345678. TrxID 9K20AB3XYZ",
  "receivedAt": "2026-09-14T09:31:00.000Z"
}
```

| Response | Meaning |
|----------|---------|
| `200 { success: true, id, status, matched, matchedRegistrationId, parsed }` | Recorded |
| `200 { success: true, message: "SMS already processed", id, status }` | Duplicate — retries are expected and safe |
| `401 { error: "Unauthorized" }` | Missing/wrong `x-forwarder-secret` |
| `400 { error: "Invalid JSON payload" \| "Invalid payload format" }` | Malformed request |
| `503 { error: "SMS log temporarily unavailable" }` | Database unreachable — the app should retry |

`status` is `matched` (TrxID found in `stem_fest_registrations`), `unmatched`
(payment SMS, no registration yet) or `ignored` (not a payment notification — a
promotional SMS, an OTP, a balance notice).

`GET /api/webhooks/sms` with the same header answers
`{ status: "ok", service, authenticated: true }` and touches **no** database. It
is the fastest way to test a URL from the phone.

### Idempotency

`client_message_id` is `UNIQUE`, and it is the only dedupe key:

- If the app sends `clientMessageId`, that value is used (a retry is a no-op).
- If it does not, the route derives one as `derived:sha256(sender|body|receivedAt)`.
  The same SMS re-delivered with the same timestamp collapses onto one row.
- A replay of a **pre-upgrade** backlog no longer dedupes against rows whose
  `client_message_id` is still `NULL` — worst case one duplicate row per replayed
  message. Deliberate: a scan on non-indexed columns at a public, unauthenticated
  endpoint is the worse trade ([[supabase-audit-2026-09-13]] finding F2).
- The insert is `ON CONFLICT DO NOTHING` and then read back, so the losing half of
  a race returns the winner's row instead of a duplicate-key error.

### Why the ingest runs in `withDbTimeout()`

Three DB round trips on an unguarded connection is this project's known hang: the
Supavisor pooler can lose a response after the statement finished, so nothing
server-side can time out and the request waits forever (`src/db/index.ts`,
2026-09-13 changelog). To a phone that is indistinguishable from a network
timeout, which is why the insert/read pair now sits in one
`withDbTimeout("smsWebhookIngest", …)` transaction — statement timeout, client
watchdog, one retry — and why a failure answers `503` instead of throwing.


## Configuring the phone app

1. Add an **HTTP / webhook target** in the forwarder app:
   - URL: `https://<site>/api/webhooks/sms`
   - Method: `POST`, `Content-Type: application/json`
   - Header: `x-forwarder-secret: <SMS_FORWARDER_SECRET>`
   - Body template: map the SMS sender field to `sender`, the message field to
     `body`, and the SMS timestamp to `receivedAt`. If the app only offers
     form-encoded fields, don't use it for this endpoint — the handler expects
     JSON.
2. Filter to the payment senders you care about (`bkash`, `nagad`, `rocket`,
   `upay`) so promotional SMS does not fill the log.
3. Set the app's HTTP timeout generously (30s).

## "Connection timed out" — troubleshooting order

Cheapest test first, run **from the phone**:

1. **Is the URL reachable at all?** Open
   `https://<site>/api/webhooks/sms` in the phone's browser with the secret header
   (or use the app's own test button). `{"status":"ok"}` proves DNS, TLS, routing
   and the secret. A spinner that never ends means the network layer, not the app.
2. **`localhost` / `127.0.0.1` is always wrong in a phone app** — that resolves to
   *the phone itself*. For local testing use the dev machine's LAN IP, from the
   same Wi-Fi: `ipconfig` → IPv4 (this machine currently reports `192.168.10.132`),
   then `http://192.168.10.132:3000/api/webhooks/sms`. Needs `pnpm dev` running,
   Windows Firewall allowing Node on the private profile, and `http://` (not
   `https://`) for a bare IP + port.
3. **Is the host letting requests through at all — and is the route deployed?** Two
   separate blockers, and the *host* one comes first because it hides the other.
   Verified 2026-09-14: production is behind Vercel's **Attack Challenge Mode** —
   `/`, `/robots.txt` and a nonsense `/api/webhooks/sms-nonsense-probe` all answer
   `403` with `X-Vercel-Mitigated: challenge`, identically, for curl's own UA, a
   desktop Chrome UA and an Android OkHttp UA. The edge answers *before* routing,
   so `X-Matched-Path` never appears, and a browser challenge can never be solved
   by a phone app. Fix: Vercel → Firewall → turn Attack Challenge Mode off, or
   better, add a **bypass rule for `/api/webhooks/sms`** and leave the rest of the
   site protected. Then the deployment gap: the webhook, the parser and
   `/admin/sms-logs` exist only on branch `finalstemfestcaba`, not on `origin/main`
   (confirm with `git cat-file -e origin/main:src/app/api/webhooks/sms/route.ts`,
   which fails while the same path resolves on `HEAD`). Merge and deploy that
   branch, and set `SMS_FORWARDER_SECRET` in the Vercel env vars.
4. **Vercel preview URLs** can sit behind Deployment Protection — requests get
   bounced or hang. Use the production alias, or turn protection off for that
   deployment.
5. **Mobile data ≠ Wi-Fi.** A LAN URL only works while the phone is on the same
   network; otherwise test against the deployed URL.
6. **Then the database.** A `503` in the log is now a database answer, not an
   unknowable one — check the pooler/Supabase from `pnpm db:verify`.

> [!warning] The endpoint fails **open** when `SMS_FORWARDER_SECRET` is unset
> `if (expected && secret !== expected)` only rejects a *wrong* secret. With the
> variable missing — the easiest thing to forget on Vercel — the webhook accepts
> anyone's POST and writes to the database. Set it in every environment. Rejecting
> outright when production has no secret is a behaviour change to a live
> integration and is deliberately left as a follow-up.
>
> The route now warns once per process — a boxed `console.warn` plus one Sentry
> `warning` — when the variable is absent, because failing open *silently* is what
> made this so hard to notice: the ingest looks perfectly healthy either way. It
> still does not reject. A `401` makes the forwarder park a real payment SMS as
> `FAILED` (ADR-0028), so tightening the check is data-losing, not merely safer.

## What the forwarder app will and will not do

The phone holds the only copy of an SMS once the handset deletes it, so the app
sorts a failed POST by **whose answer it was** (ADR-0028):

| The answer | The app | The message |
|-----------|---------|-------------|
| The webhook's own `400`/`401`/`409`/`413`/`422` JSON | Park it | `FAILED`, no further retries |
| Vercel `403` challenge, HTML `404`, dropped connection, timeout, `5xx` | Report the condition (`HostSecurityChallenge` / `No webhook route at …` / `ServerUnavailable`) and wait | Still `PENDING`, **retry budget untouched** |
| Anything else | Back off exponentially (30s → 30min, `Retry-After` honoured) | `PENDING`, one retry spent |

It also prefers IPv4 when a host resolves to both families (a preference, never a
filter — no address is dropped, and an IPv6-only host still works), and sends its
own `User-Agent` so a firewall rule can be matched to it. So an afternoon of edge
challenges cannot silently delete a payment: `PENDING` rows piling up in
`/admin/sms-logs` is the alarm instead.

## Related

[[api-architecture]] · [[database-supabase]] · [[environment-variables]] ·
[[supabase-audit-2026-09-13]] · [[backend/README]]

