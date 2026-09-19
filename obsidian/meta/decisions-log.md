---
tags: [meta, decision]
updated: 2026-08-30
---

# Decisions Log (ADRs)

Why this project's conventions are what they are. Each entry records a decision,
the reasoning behind it, and what it constrains when you build.

These are **inherited from the starter** — they explain the rules in `AGENTS.md`
and across the vault, and notes link to them by number. Add your project's own
decisions on top, continuing the numbering. Amending an inherited decision is
fine; write a new ADR that says so rather than editing the old one.

Template: [[templates/adr-note]].

---

## ADR-0031 — Registration IDs are minted by a database trigger, never by the application

**Status:** Accepted · 2026-09-19

**Decision.** Every row in `stem_fest_registrations` carries a human ID,
`<GENDER><CLASS><NNN>` (`M7001`, `FAS001`, `OU001`), assigned by a `before insert`
trigger. The number comes from a per-prefix counter table
(`stem_fest_registration_counters`) bumped with a single
`insert … on conflict do update … returning`, which takes a row lock. The column is
`NOT NULL` with a unique index; the trigger never rewrites an ID that already holds a
value. No application code sets or generates the ID — it reads it back after insert.

**Why.** The ID is what a participant is told and what the club looks rows up by on
the results sheet, so two properties matter more than anything else: it exists for
every row, and no two participants ever share one.

- **Atomicity.** Two participants submitting in the same second is the *normal*
  case on a registration day. A `select max(...) + 1` in the Server Action reads the
  same "last number" twice under exactly that load, and the collision surfaces later
  as two people holding one ID on a printed sheet. The counter's row lock serialises
  concurrent submissions instead.
- **Every insert path.** The public form writes through the Supabase service-role
  client, an admin can correct a row from the SQL editor, and the payment-SMS
  forwarder writes rows of its own. Application code mints an ID only for the path it
  was written into; a trigger covers all of them.
- **IDs are forever.** The trigger leaves a non-empty `registration_code` alone, so an
  ID cannot change under a participant who has already been told what it is. The
  unique index is the backstop: if the trigger is ever dropped, the next insert fails
  loudly instead of storing a row with no ID.
- **Gender/class semantics live with the trigger.** `X` is the honest letter for a row
  with no gender on file — distinct from `O` (Other) so a report can never mistake
  "we did not ask" for "they chose Other" — and an unrecognised class still yields a
  usable code rather than an ID with no class in it. The form's ID hint copy shows the
  shape with a worked example (`M7001`) and deliberately does not restate the mapping
  table, so the two cannot drift.

**What it constrains.**

- **The DDL file and the Drizzle mirror move together by hand.**
  `drizzle/add_stemfest_registration_ids.sql` (idempotent, with a backfill for rows
  that predate the trigger) and the `stemfestRegistrations` /
  `stemfestRegistrationCounters` tables in `src/db/schema/stemfest-registrations.ts`
  are two descriptions of one thing — the same discipline as the functional index in
  ADR-0027. Run the SQL in Supabase **before** deploying code that selects the column.
- **Never write the column from the app.** Readers select it; writers omit it. An
  explicit value is respected by the trigger (that is what keeps admin corrections from
  renumbering), so an accidental write would silently win.
- **New gender/class values need trigger-side letters/codes.** The catalogue in
  `src/lib/data/stemfest-registration.ts` is the form's vocabulary only; the letter and
  code each option produces live in `stemfest_gender_letter` / `stemfest_class_code`.
  Adding an option without extending the functions is how `X`-prefixed IDs start
  appearing.
- **The prefix is fixed-width, the counter is not bounded.** Three digits is the
  documented minimum, not a ceiling — the 1000th Class-7 boy is `M71000`, and it still
  sorts correctly because the prefix never changes width.

Supersedes nothing; extends ADR-0027's rule that hand-written DDL is mirrored in the
Drizzle schema.

---

## ADR-0030 — A catalogue-backed dropdown carries the id; the row stores the label

**Status:** Accepted · 2026-09-14

**Decision.** Where a form field's options come from a catalogue in
`src/lib/data`, the **submitted value is the option's `id`** and the value
*stored* is the option's display name, resolved at submit time by a named
function next to the schema. The first field to work this way is the STEM Fest
registration form's School dropdown (`stemfestSchools`, resolved by
`resolveSchoolName` in
`src/app/(routes)/(site)/stemfestreg/validate.ts`), with
`STEMFEST_OTHER_SCHOOL_ID` as the sentinel whose "id" resolves to a typed-in
name instead.

Three rules follow from it:

1. The schema validates the **id** against the catalogue (`schoolIds`, built
   once from `stemfestSchools`), and the free-text companion field is validated
   only when the sentinel is chosen. Both checks live in the same
   `superRefine`, so the two can't disagree about which branch is active.
2. The label is resolved on the **server**, in the action that writes the row —
   never in the component. A client-supplied display string is untrusted input;
   resolving server-side means the row can only ever hold a name the catalogue
   or the participant actually produced.
3. A catalogue entry may be **renamed or reordered freely**, because no stored
   row holds its index or a pointer into the array.

**Why.** The immediate reason is that `stem_fest_registrations.school` already
existed and was `not null`, yet the action wrote the host school as a literal
into every row. Introducing a real field meant choosing what to persist, and the
two obvious options both have a trap:

- **Store the id.** Cheapest to validate, but the column is read by the admin
  table's search filter, its printed report and the `Unique Schools` stat — all
  of which compare on human text (`contains(t.school, …)`,
  `count(distinct lower(btrim(school)))`). Storing ids would have meant a join or
  a lookup in each, and would have retired the report column's meaning.
- **Store whatever the browser sent.** Skips the resolution step, but it hands
  the *stored school name* to the client. A "not listed" free-text field is the
  realistic case, and a client that can write an arbitrary school string can
  also write a name that sorts next to a real one in the schools report.

Keeping the id as the wire format and the name as the stored format gets both:
the schema still rejects an option that isn't in the catalogue, and the column
stays exactly as queryable as it was. It also means the schools list is data —
adding a school is one array entry (the launch TODO) with no migration.

**What it constrains.**

- **A catalogue-backed field needs both halves.** An id-only field with no
  resolution function has no defined stored representation; a label-only field
  has nothing to validate against. Add the resolver beside the schema, and have
  the action call it rather than the component.
- **`resolveSchoolName` is the only place the sentinel becomes text.** It
  returns the typed name trimmed, or the catalogue's name, and nothing else —
  the form and the receipt both call it so the receipt can't show a different
  string from the one stored.
- **The stored column keeps its old semantics.** `school` remains a plain
  human-readable name, so the pre-existing admin filters, report column and
  `Unique Schools` stat needed no change at all. A future field that breaks this
  is making a different decision and needs its own ADR.
- **Rows are not rewritten when the catalogue changes.** Renaming a school in
  `stemfestSchools` affects new submissions only; `Unique Schools` would then
  count both spellings. That is accepted for now — the list isn't live yet — but
  it is the reason to settle the school names *before* launch rather than after.

---



**Status:** Accepted · 2026-09-14

**Decision.** Every admin table reads a single declarative contract in
`src/lib/admin/filters.ts`: an `AdminSourceConfig` per source naming its filter
fields, their `kind` (`text` | `select` | `date` | `number`), its sort options,
its copy and its report columns. The filter bar renders from that config, the
table page parses the query string into an `AdminQueryState` with
`parseAdminQuery`, and the printed report at `/admin/reports/[kind]` re-parses
the very same query string and runs the very same WHERE builders through
`getAdminReportRows`. Adding a filter to a source's array plus its WHERE branch
carries it the whole way — table, chips, empty state, PDF — without touching a
component.

**Why.** The four admin tables had grown four separate filter stories: each
re-implemented its own search, some had no filtering at all, and the "export"
was a client-side print of whatever happened to be rendered. That made three
classes of bug reachable and unremarkable:

1. **An export that disagreed with the screen.** There was nothing forcing the
   report's query to be the table's query, so an export could silently ignore a
   filter — and a spreadsheet derived from it would be wrong in a way nobody
   could see from inside the app.
2. **Copy that contradicted the data.** "No registrations yet" on a table that
   had 4 000 rows and one active filter reads as a bug in the data, not in the
   view. `emptyStateLabel` now has one place to know the difference, and it is
   the config's `empty` block.
3. **A country-specific off-by-one-day.** Date bounds are stored as
   `timestamptz`; a bare date is read as UTC and splits a Dhaka calendar day at
   6am local, so "from 14 September" quietly meant 13 Sep 18:00 → 14 Sep 18:00.
   `ADMIN_TIME_ZONE` is now applied centrally by `dayRange` rather than
   re-derived at each call site.

The URL is the state, deliberately. An admin's filtered view is then
linkable, shareable, reloadable and reachable from the printed report's back
link — none of which is true of component state, and a hand-edited
`?page=999` lands on the last real page instead of an empty one that reads as
"no matches". `DEFAULT_SORT` is omitted from generated links so one canonical
URL means the search box cannot re-navigate forever.

The report is capped by `REPORT_ROW_LIMIT` (2 000) and says so when it hits the
ceiling. A report reads every matching row, not one page, so it needs a bound
the table does not: without one, an unfiltered export of a table that grew
unexpectedly would pin a pooled connection until the statement timeout. It
truncates loudly rather than silently.

**What it constrains.**

- A filter's `kind` fully describes its SQL behaviour, and the action layer
  implements exactly the four in the table at the top of `filters.ts`. **No
  fifth comparison may be added in a component.** A filter that needs different
  semantics gets a new `kind`, added in both places.
- `filters.ts` is imported by Server Components *and* client leaves, so it
  stays plain data and pure functions — no `env`, no database, no `next/headers`.
  `REPORT_ROW_LIMIT` lives there rather than next to the query for this reason:
  a `"use server"` module may only export async functions.
- `AdminReportColumn.id` is a string because report rows are
  `Record<string, string>`. TypeScript therefore **cannot** catch a column id
  that no mapper produces. The ids and the mappers in `getAdminReportRows` are
  kept in step by hand and listed in [[admin/filters-reports]] → "Report
  columns"; a mismatch ships as a blank column on paper.
- Print behaviour is CSS, not JS: the report route is server-rendered plain
  HTML and the admin shell declares itself to the print stylesheet with
  `data-print` attributes. No PDF library is added to the stack — the browser's
  print dialog is the PDF renderer.
- An admin page that aggregates several independent sources reads them with
  `Promise.allSettled` and resolves each through `unwrap`
  (`src/lib/admin/source-status.ts`), so one failing source degrades to `—` and
  reports itself to Sentry instead of blanking the page. A missing figure and a
  real zero must not be distinguishable only by absence.

Supersedes nothing; extends ADR-0026 (admin reads: sequential statements,
layered timeouts, pool above concurrency), whose timeout wrapper every query
above runs inside.


## ADR-0028 — A host-level answer never discards a forwarded SMS

**Status:** Accepted · 2026-09-14

**Decision.** The Android forwarder app sorts a failed POST into three outcomes,
and which one it picks is decided by *whose* answer it was — not by the status
code alone:

1. **The webhook's own permanent rejection** — `400`, `401`, `409`, `413`, `422`
   answered by `/api/webhooks/sms` itself. That is a statement about this message
   or this configuration, and it will fail identically next time, so the SMS is
   parked `FAILED` (`PERMANENT_CODES` in `SyncMessagesUseCase`).
2. **A host-level answer** — Vercel's `403` challenge
   (`x-vercel-mitigated: challenge`), an HTML `404` because the running deployment
   does not carry the route, a dropped connection, a timeout, a `5xx`. None of
   these says anything about the message. It stays `PENDING`, it is **not** charged
   a retry against `MAX_RETRIES` (10), and the app names the condition instead:
   `TestConnectionResult.HostSecurityChallenge` for the challenge,
   `InvalidUrl("No webhook route at …")` for a missing route, `ServerUnavailable`
   for a timeout.
3. **Everything else** — retryable, exponential backoff from 30s to a 30min cap,
   `Retry-After` honoured.

Classification is **signature**-based (`HostChallenge`), because the status is not
trustworthy on its own: the challenge headers, the content type, and whether the
body parses as the webhook's own JSON are what decide.

**Why.** Production sat behind Vercel's Attack Challenge Mode (2026-09-14
changelog), so every forward was answered `403` at the edge, before routing ran.
Under the previous "any 4xx means this message is bad" rule the app marked each
real bKash payment SMS `FAILED` for good — and spent its whole retry budget on a
condition no retry could ever change. That is the worst failure available to this
pipeline: the queue on the phone is the *only* copy of an SMS that has already
arrived and been deleted from the handset, so a bad day on the host must not be
allowed to destroy the payment record it was holding.

**Consequences.** A misconfigured or undeployed host now *strands* messages
instead of deleting them, so `PENDING` rows piling up is the alarm that matters —
that is the deliberate trade, and `/admin/sms-logs` is where it is watched. Two
rules follow for anyone touching this pipeline: a newly-handled status code has to
be classified against the three outcomes above before it ships, and nothing may
join `PERMANENT_CODES` that is not literally the webhook's own permanent
rejection. The rule is enforced by tests, not just written down — `HostChallengeTest`,
`SyncMessagesUseCaseTest`, `PreferIpv4DnsTest` — and disabling the interception
detector fails six of them. Contract and phone-side setup: [[sms-forwarder]].

---

## ADR-0027 — Supabase audit: rotate the leaked key, keep RLS owner-only, index the query shapes

**Status:** Accepted · 2026-09-13

**Decision.** Five things follow from the architecture audit recorded in
[[supabase-audit-2026-09-13]]:

1. **The service-role key is treated as compromised and must be rotated.**
   `drizzle/setup-ambassador-table.mjs` had shipped a service-role JWT that was
   byte-identical to the live one, in a git commit pushed to GitHub. The literal
   is gone from the tree; rotation is the part that actually revokes the
   exposure. No secret may be written into a tracked file again — read from
   `process.env`, and fail loudly when it is absent.
2. **RLS stays owner-only for the better-auth tables, and is understood as
   such.** All 13 `public` tables have RLS on; the registrant tables have
   permissive policies for `service_role` only, and the auth tables have none.
   This is deliberate (ADR-0024) but it means **RLS is not a safety net** — it
   holds because the app connects as the owner, and `FORCE ROW LEVEL SECURITY`
   is off. Changing the connecting role would turn every read into a silent
   empty result.
3. **Indexes are declared in the Drizzle schema, not only applied by hand.**
   The deployed `upper(transaction_id)` functional index and its Drizzle
   declaration had diverged; `pnpm db:migrate` (`drizzle-kit push`) would have
   replaced the functional index with a useless plain one. A hand-written index
   and its schema declaration are two descriptions of one thing, and only the
   schema one is what migrations enforce.
4. **`idle_in_transaction_session_timeout` and `lock_timeout` are set at the
   database level.** A client-side watchdog stops the client waiting; it cannot
   stop the server running. Leaving the idle-in-transaction timeout at `0` means
   an abandoned transaction pins a backend indefinitely.
5. **Unindexable `%ILIKE%` admin search is accepted for now.** It becomes a
   trigram GIN index when the largest searchable table passes ~50k rows, not
   before.

**Why.** The audit measured the live project rather than reading the repo, which
is how F7 in particular surfaced: a change that would have silently degraded
performance with no error, invisible from either the database or the code alone.

**When building.** Indexing a new query shape means declaring the index in
`src/db/schema` *and* applying it — a schema-only or SQL-only change is drift.
Never put a key or connection string in a tracked file. Before changing the
database role the app connects as, re-read point 2.

---


## ADR-0026 — Admin reads: sequential statements, layered timeouts, pool above concurrency

**Status:** Accepted · 2026-09-13

**Decision.** Three changes to how the app talks to Supabase, all in service of
one goal — an admin page must never hang:

1. **Pool `max: 5`,** sized deliberately *above* the number of statements a
   single page load issues. (`src/db/index.ts`)
2. **Every admin read goes through `withDbTimeout(label, read)`**
   (`src/db/query.ts`), which wraps the read in one transaction, applies
   `SET LOCAL statement_timeout = '8000ms'`, races it against a 12s client-side
   watchdog, and retries once on a retryable failure.
3. **Statements are issued sequentially inside a read**, never through
   `Promise.all` — a `count(*)` first, then the page `SELECT`. Independent
   *sources* are still fetched concurrently, but degraded individually via
   `Promise.allSettled` + `unwrap()` (`src/lib/admin/source-status.ts`).

**Why.** The admin panel failed intermittently with a network error / `57014`.
The queries were **not** slow (every `stem_fest_*` read measured ≤48 ms in
`pg_stat_statements`). The actual failure was in `postgres.js`'s pipelining:
when more statements are issued at once than there are pooled connections, the
extras are written onto an already-busy connection, and Supavisor can drop the
response. The server-side backend then reads `state = idle` — the work is
*finished* — while the client waits forever. That is why no server-side timeout
could ever rescue it, and why the symptom looked random: it depended purely on
whether two page loads overlapped.

`SET LOCAL` (rather than `SET`) is required because the transaction pooler may
route each transaction to a different backend, so a session-level setting would
leak onto the next client that uses that backend. It also cannot be set at
connection time: Supavisor discards startup GUCs, so a `connection: {
statement_timeout }` option on the `postgres()` client is silently ignored and
reads back as Supabase's default `2min`.

Independent sources are still concurrent, but one failing source must not blank
the page — previously a single rejection took down the whole `Promise.all` and
hid the sources that were healthy.

**When building.** Use `withDbTimeout()` for any new admin read; never
`Promise.all` two statements onto the same `tx` (the `count(*)` then page
`SELECT` pattern in `src/lib/actions/registrations.ts` is the reference). If a
page gains a new independent data source, add it to the `Promise.allSettled`
list and render `UNAVAILABLE` for it via `formatCount()`/`unwrap()` rather than
letting it reject.

Two traps worth remembering, both measured against the live pooler:

- **Drizzle wraps driver errors.** A Postgres failure arrives as
  `Error("Failed query: …")` with the real `PostgresError` on `.cause`, so
  `error.code` is `undefined`. `isRetryableDbError()` must walk the `cause`
  chain or every entry in its retryable set is dead code (it was, until
  ADR-0026).
- **`57014` is deliberately not retried.** Our own 8s budget cancels the
  statement before the 12s client watchdog can fire, so a retry would double the
  wait to ~16s and fail identically. Only connection-class failures
  (`08xxx`, `53300`, `57P0x`), bare pooler disconnect messages, and the client
  watchdog itself are retried.

`pnpm db:verify` (`scripts/verify-admin-db.ts`) verifies all of this against the
live database: the old concurrency shape, four repeat rounds, the dashboard's
four sources, real `statement_timeout` cancellation, and the retry decision for
each error class.

**Recommended Supabase setting (not code):** set
`idle_in_transaction_session_timeout = 30000` on the database. It currently
reads `0` (disabled), which lets an orphaned open transaction pin a pooled
connection indefinitely. `scripts/db-diagnose.mjs` reports the current value.

---



**Status:** Accepted · 2026-08-30

**Decision.** Curated imagery stored in the Supabase `avatars` bucket is
re-encoded once, offline, to WebP at 2x its rendered size and uploaded under
`optimized/` with a one-year `cache-control`. Components render those URLs with
`unoptimized`, so no request ever reaches `/_next/image`. URLs that are not
known at build time (CMS author avatars, stored profile pictures) are pointed at
Supabase's own `/storage/v1/render/image/` endpoint instead.
`scripts/optimize-bucket-images.mjs` regenerates the set; `bucketImage()` and
`renderedImageUrl()` in `src/lib/media.ts` build the URLs.

**Why.** `/legacy` referenced 25 bucket objects totalling 17.7 MB — the largest a
9.35 MB PNG of a headshot being drawn into a 320 px card. With the optimizer on,
Vercel re-transformed each object whenever its cache expired, and
`minimumCacheTTL` was unset (60 s default), so one page view could trigger dozens
of metered "image transformations", each pulling the multi-megabyte original back
out of Supabase. Setting `unoptimized` stopped the billing but shipped raw bytes
instead. Both were the same mistake: the *source* assets were the wrong size and
format. Pre-optimising removes the need to transform at all — the bytes the CDN
sends are already the bytes the browser wants. `/legacy` image weight went
17.7 MB → 0.66 MB with zero optimizer requests.

**When building.** After adding an image path to `src/lib/data/index.ts`, run
`pnpm images:optimize` (`:dry` to preview). Never reference a raw original. The
rendered size of a card is what picks its profile in the script, so if a layout
grows materially, bump the profile and re-run rather than switching the optimizer
back on. User uploads stay small by construction — `profile-form.tsx` compresses
to 512 px WebP client-side before the request, so the optimizer is not needed to
tame an oversized file.

---

## ADR-0024 — Auth tables: RLS removed, schema aligned with better-auth plugins

**Status:** Accepted · 2026-08-19

**Decision.** The four better-auth tables (`user`, `session`, `account`,
`verification`) drop `enableRLS()`. `session` gains `impersonatedBy` (declared by
the better-auth `admin()` plugin). `user.gender` becomes nullable.

**Why.** The app connects to Postgres as the database owner
(`postgres.<db>` via `postgres-js`, see `src/db/index.ts`), which has
`BYPASSRLS` — so `ENABLE ROW LEVEL SECURITY` with no `CREATE POLICY` was a no-op
that read as false protection, and would fail-closed (empty reads) if the
connection ever switched to a limited role. Removing it makes the schema honest.
`impersonatedBy` is required by the `admin()` plugin's session schema
(`dist/plugins/admin/schema.mjs`) and was missing, so `admin.impersonateUser`
would fail at runtime. `gender` was `NOT NULL` with no default while only the
sign-up form sets it — nullable is a safety net so future non-form creation
(admin-created users, OAuth) does not violate the constraint.

**When building.** Do not re-enable RLS unless the app adopts a Supabase-role
connection (anon/authenticated) with real policies; the Drizzle schema must match
whatever `drizzle-kit push` applies. If auth traffic grows across instances,
`rateLimit.storage` should move off the default in-memory store to a shared
secondary storage. The `posts` table still carries `enableRLS()` — revisit it
under the same reasoning.

---

## ADR-0023 — Adopt the harness, keep the existing motion & backend stack

**Status:** Accepted · 2026-08-19

**Decision.** This project adopts the starter's vault, skills, hooks and
`verify.sh`, but **not** its vendored spring engine or Payload/Supabase backend.
The hard rules in `AGENTS.md` are rewritten to enforce the stack that already
exists here: GSAP + `motion/react` + three.js for motion, Drizzle (Postgres) +
better-auth + Resend for the backend, pnpm as the package manager.

**Why.** The site already ships a blackhole-shader hero, GSAP scroll sections
and a working CMS/auth layer. Rewriting every animation on `@react-spring/web`
and swapping the database for Payload would be a high-risk, zero-feature
migration. The value being adopted is the *enforcement system* — vault as
source of truth, skills, hooks, mechanical verification — which is
stack-agnostic once the rules are rewritten.

**Supersedes, for this project:** ADR-0002 (springs-only motion), ADR-0009
(shared ticker), ADR-0020 (Payload + Supabase per project). All other inherited
ADRs stand where they apply.

**When building.** Starter-specific vault notes ([[animation-system]],
[[text-engine]], [[smooth-scroll]], [[cms-payload]], [[database-supabase]],
the `payload-cms` / `supabase-db` / `supabase-auth` skills) describe the
starter, not this project — read them as reference only. Project truths:
motion goes through GSAP/`ScrollReveal`/`motion/react` and must honour
`prefers-reduced-motion`; three.js scenes follow the `optimize-3d-scene`
skill's shape (see `src/components/home/blackhole-shader.tsx`); content lives
in `src/lib/data/index.ts`; verification is `verify.sh` + `pnpm lint` +
`pnpm build`.

---

## ADR-0022 — Track latest within majors; hold TypeScript 7 and ESLint 10

**Status:** Accepted · 2026-08-18

**Decision.** Dependencies track the newest release **within their current
major**. Three majors are deliberately held back.

**Why.** Stale pins hand every new project a migration debt on day one; a broken
toolchain is worse. Each hold was tested, not assumed:

- **TypeScript 5, not 7** — `eslint-config-next` depends on `typescript-eslint@8`,
  whose peer range is `typescript >=4.8.4 <6.1.0`. TS 7 breaks `yarn lint`.
- **ESLint 9, not 10** — ESLint 10 removed `context.getFilename()`;
  `eslint-plugin-react` still calls it, so linting dies on startup.
- **`@types/node` tracks the Node major in use**, not the newest published.

**When building.** The blockers live in someone else's dependency graph, so they
lift without work here — **re-test periodically** rather than treating them as
permanent. [[tech-stack]] carries the table and the reasons. Node ≥ 20.19 is a
hard floor (`engines` + `.nvmrc`): the ESLint toolchain fails to install below it.

---

## ADR-0021 — SEO is a practice with a workflow, not just a metadata helper

**Status:** Accepted · 2026-08-18

**Decision.** SEO and AEO get skills, an audit agent and a documented order of
work ([[seo-aeo]]), not just the metadata utilities.

**Why.** The mechanism existed; the practice did not. Nothing checked whether a
new route reached `sitemap.ts`, whether titles were unique, or whether the site
was legible to answer engines — the fastest-moving part of search and the one
most likely to be skipped.

**When building.** Audit in order: indexability → metadata → content structure →
structured data → performance → AEO. A perfectly optimised page that cannot be
crawled is worth nothing. **AI-crawler policy is the user's decision** — "be
cited by AI" and "don't train on my content" need different bots allowed. Never
cloak, and never emit schema describing content that is not on the page.

---

## ADR-0020 — Payload + Supabase are the CMS and database, added per project

**Status:** Accepted · 2026-08-18

**Decision.** Payload (Postgres adapter) on Supabase are the documented defaults.
**Neither ships in the starter** — the `payload-cms` / `supabase-db` skills
install them when a project needs them.

**Why.** Payload runs *inside* the Next app — admin as a route group, content via
an in-process Local API, types generated from the schema — which matches how this
starter already works (Server Components reading data, passing props down) and
keeps deployment one Vercel project. Supabase covers database, media bucket and
optional auth in one service. Most projects from this starter are marketing sites
that never need either, so an unused install would be a large dependency surface
and a migration story maintained for nothing.

**When building.** [[cms-payload]] and [[database-supabase]] carry the
conventions. Two constraints break installs if ignored: `@payloadcms/next` pins a
minimum Next version (verify before installing), and Supabase's connection
strings are not interchangeable — runtime on the transaction pooler (6543, no
prepared statements), migrations on the direct connection (5432).

---

## ADR-0019 — Hard rules get a mechanical check, not just prose

**Status:** Accepted · 2026-08-18

**Decision.** `.claude/scripts/verify.sh` checks every hard rule that is
objectively decidable from source and exits non-zero on any FAIL. Judgement calls
stay with the `qa-verify` skill.

**Why.** Rules that are never checked decay into suggestions, and silently — a
stray `@keyframes` or hardcoded hex surfaces at review, if at all. `yarn lint`
knows nothing about springs, token tiers or route delegation.

**When building.** Run it after any code change ([[qa-verification]]). It greps
rather than parsing TypeScript, so it is biased toward false positives: a
dismissed warning costs seconds, an unchecked rule costs a review cycle. WARNs
never fail a build, so justify them rather than ignoring them.

---

## ADR-0018 — Split the docs into knowledge (vault) and execution (`.claude/`)

**Status:** Accepted · 2026-08-18

**Decision.** The vault stays the single source of truth for *why* and *what*;
`.claude/` holds *how it runs* — path-scoped rules, skills, agents, commands and
the verify script ([[agent-harness]]). Every skill, agent and command is
registered in the vault.

**Why.** Documentation that cannot be executed gets skipped; execution files
without recorded reasoning drift and duplicate. Keeping each mechanism to one job
avoids both.

**When building.** `.claude/` files stay short and point into the vault rather
than restating it — restated rules drift out of sync. **Path-scoped rules fire
when Claude *reads* a matching file, not when it writes one, and are not
re-injected after `/compact`.** They reinforce; they never guarantee. Anything
that must hold unconditionally belongs in `verify.sh` or a hook.

---

## ADR-0017 — A skill states its preconditions and its own internal conflicts

**Status:** Accepted · 2026-07-24

**Decision.** Every skill must state the environment its measurements assume, and
name explicitly where one of its steps undermines another.

**Why.** `optimize-3d-scene` was run on a real scene and the fix *order* held up
— what cost hours was everything left implicit: a first step that could not be
executed on the stack in front of it, measurements silently invalidated by the
dev server, and two individually correct steps that contradicted each other.

**When building.** When writing or editing a skill: a step names its
preconditions, and a step names where it fights another step. Numbers taken in
the wrong environment are worse than no numbers, because they read as evidence.

---

## ADR-0016 — Skills are registered in the vault, not just dropped in `.claude/`

**Status:** Accepted · 2026-07-24

**Decision.** A skill is only "installed" once it lives in `.claude/skills/<name>/`,
has a vault note under `workflows/`, is linked from [[README]] and
[[ai-agent-guide]], and — if invocation should be non-optional — has a routing
rule in `AGENTS.md`.

**Why.** A skill folder is discoverable to Claude Code at runtime but invisible in
the vault, leaving the invocation decision to model judgement. Where the skill
exists *because the order of operations matters*, that is exactly the wrong thing
to leave to chance.

**When building.** Registration is also when a skill gets checked against reality
— stale paths and references to files that do not exist surface here.

---

## ADR-0015 — Strict three-tier design-token naming convention

**Status:** Accepted · 2026-07-17 · amends ADR-0004

**Decision.** Tokens follow three tiers with an explicit grammar: primitive
`--raw-<category>-<name>[-<shade>]` → semantic `--<role>[-<variant>][-<state>]` →
`@theme inline` binding. Only Tier 1 holds literals; Tier 2 names purpose, never
appearance, and is the themeable layer. No tier may be skipped.

**Why.** ADR-0004 made tokens the styling currency but never said what a token
should be *called*, so every project would invent its own — defeating the point of
a shared starter. The names are predictable across projects by design.

**When building.** Full rules in [[design-system]]. Two Tailwind v4 facts,
verified by compiling a probe stylesheet, that guides commonly get wrong:

1. Naming primitives `--color-*` would **generate a utility for every raw value**
   and let markup bypass the semantic tier — hence the `--raw-*` prefix, kept out
   of `@theme`.
2. **There is no `--duration-*` namespace.** `duration-fast` compiles to nothing.
   Durations stay Tier 2 and are used as `duration-[var(--duration-fast)]`.
   (`--ease-*` *is* real.)

`@theme inline` is load-bearing: `inline` inlines the `var()` into each utility so
Tier 2 overrides cascade. Binding a literal there freezes the value and silently
breaks theming.

---

## ADR-0014 — Narrow CSS-transition exception for trivial state changes

**Status:** Accepted · 2026-07-17 · amends ADR-0002

**Decision.** All real motion stays spring-based, with one exception: CSS
`transition-*` for simple discrete state changes — `hover:` / `focus-visible:` /
`active:` colour, opacity, border, underline, and small decorative nudges.

**Why.** The outright ban cost most where it helped least: a nav link fading its
colour on hover needed a client component and a spring config to animate one
property nobody will interrupt. The rule pushed toward boilerplate or quiet
rule-breaking.

**When building.** Three conditions, all required, or it is a spring:
token-backed timing (`duration-[var(--duration-fast)] ease-entrance`),
`transition-*` only (`@keyframes` stay banned outright), and utilities only —
never a CSS file. Everything scroll-driven, revealing, staggered, orchestrated,
layout-affecting or interruptible remains a spring; text stays [[text-engine]].
The list is enumerated rather than a judgement call ("simple animations") so it
cannot erode into general CSS animation. Past the list, use `<Hover>`.

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

**Status:** Accepted · 2026-06-07

**Decision.** Second authorised edit to the protected engine: `<Inview>` now
calls its callback ref so it observes itself when no `trigger` is passed, and
`<Inview>` / `<Spring>` / `<Hover>` pass the React-tracked `width` into
`isMobileDisabled(value, width)`.

**Why.** `<Inview>` only animated when given an external `trigger` — the common
case silently did nothing, because a callback ref was being assigned as
`.current` instead of called. Separately the `width` dependency was tracked but
never used, so resize re-evaluation of mobile gating did nothing.

**When building.** The springs folder stays `#do-not-modify` by default — these
were explicitly signed-off bug fixes, not an opening.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

**Status:** Accepted · 2026-05-22 · amends ADR-0004

**Decision.** A strict placement order, first match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` |
| Repeated pattern with markup/structure/props | a **React component** in `components/ui/` |
| Repeated pure-utility combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party overrides, complex selectors | `@layer components` |
| A new colour/spacing/radius value | a token (per ADR-0015) |

**Why.** With tokens in `globals.css` and guidance to extract repeated patterns
into `@layer components`, the path of least resistance made that file a dumping
ground — hundreds of component-specific classes never deleted when their
component was. Splitting the file would only spread the same bloat; the fix is a
placement rule.

**When building.** The default answer to "this looks repeated" is a **React
component**, not a CSS class — an eyebrow label with a `::before` dot is an
`<Eyebrow>`, not a `.label-eyebrow`. `globals.css` holds imports, tokens, base
resets and the narrow `@layer components` exceptions; if it grows past that,
something was misplaced. **CSS Modules were considered and rejected** — a second
styling mechanism is not worth the mental model when motion is spring-based (no
keyframes to co-locate) and utilities plus components cover everything else.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

**Status:** Accepted · 2026-05-22

**Decision.** External calls go through Next.js Route Handlers at
`src/app/api/<resource>/route.ts`. The handler owns the work — business logic,
upstream calls, filtering, secret env vars. No mandatory passthrough service
layer; extract shared code only when genuinely reused.

**Why.** `route.ts` is never bundled to the browser, so it is the natural place
for secrets, and a single convention keeps every endpoint the same shape.

**When building.** Every endpoint validates input with `zod` and returns the
`{ data }` / `{ error }` envelope via the shared `handle()` wrapper. Secret env
vars are unprefixed and read through `getServerEnv()`; `NEXT_PUBLIC_` is only for
browser-safe values. Client Components fetch same-origin via `apiFetch`;
render-time data is read in Server Components. Full note: [[api-architecture]].
Server Actions were considered for mutations and deferred — revisit with a new
ADR if forms need progressive enhancement.

---

## ADR-0010 — SEO & performance hardening

**Status:** Accepted · 2026-05-21

**Decision.** `src/lib/site.ts` (`siteConfig`) is the single source of truth for
SEO. `metadataBase` is always set; `themeColor` lives on the `viewport` export.
Added `robots.ts`, `sitemap.ts`, JSON-LD, `loading.tsx` / `error.tsx` /
`not-found.tsx`, and `<ReducedMotion>`.

**Why.** Relative OG/canonical URLs never resolved to absolute, so social
previews broke in production; an animation-heavy starter ignored
`prefers-reduced-motion`; and the home view was a top-level `"use client"`,
breaking the server-first rule it should model.

**When building.** Set `NEXT_PUBLIC_SITE_URL` in every deployed environment or
canonical and OG URLs resolve to localhost. `<ReducedMotion>` toggles
react-spring's global `skipAnimation` from one app-root mount, covering every
spring and the text engine at once. **`isBot()` is discouraged** — it opts the
route out of static rendering and edges toward cloaking; reduced motion is the
preferred lever, since springs only animate opacity/transform and content is in
the DOM for crawlers regardless ([[seo-metadata]]).

---

## ADR-0009 — Shared animation ticker; authorised engine performance refactor

**Status:** Accepted · 2026-05-21 · amends ADR-0002

**Decision.** One-time authorised refactor of the protected engine, plus a shared
loop primitive: `src/lib/animation/ticker.ts` — a single app-wide,
reference-counted rAF loop that starts on the first subscriber and stops on the
last. It is **not** `#do-not-modify`; it is the supported extension point.

**Why.** Cost scaled with the number of animated components: a private rAF loop
per `useLoop` instance that never stopped, a debounced `resize` listener per
spring component, and an `IntersectionObserver` re-created on every render.

**When building.** A page with N animated components now runs **one** rAF loop
and **one** resize listener. Subscribe new per-frame work to the ticker rather
than starting a loop. Hard rule #2 was amended here: the engine stays protected
by default and changes need explicit sign-off — this ADR is not a precedent for
editing it.

---

## ADR-0008 — Adaptive scaling grid via root font-size

**Status:** Accepted · 2026-05-21

**Decision.** Keep a rem-based design proportional across viewports by scaling
`html { font-size }`: `vw`-based media queries in `globals.css` for scaling down,
and a `<AdaptiveGrid>` client component for scaling up beyond the largest
breakpoint.

**Why.** The behaviour arrived as a `styled-components` implementation, which is
not a project dependency and conflicts with the CSS-only config rule. Only the
behaviour was kept; the implementation was rebuilt on the project stack.

**When building.** Breakpoints live in `grid.config.ts` **and** are mirrored in
the `globals.css` media queries — duplicated by design, since ADR-0004 forbids
generating CSS config from JS. **Keep the two in sync**; the formula is written
in both files. Design px map cleanly to rem at the design base width.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

**Status:** Accepted · 2026-05-21

**Decision.** Encode the "read the vault first, update the docs after" workflow as
hooks in `.claude/settings.json`: `SessionStart` injects a pointer to the vault,
`UserPromptSubmit` reminds the agent to consult the relevant guide,
and `Stop` blocks **once per turn** to confirm docs were updated.

**Why.** Documentation drifts the moment it depends on someone remembering.

**When building.** The `Stop` hook uses a `${TMPDIR}` marker keyed by session id
so it blocks at most once per turn — no infinite loop. Hooks are reviewable and
disableable via `/hooks`, and take effect at the next session start.

---

## ADR-0006 — The vault is the single source of truth

**Status:** Accepted · 2026-05-21 · amends ADR-0001

**Decision.** The vault is the **only** documentation source. The repo root keeps
thin shims: `AGENTS.md` carries the breaking-change warning and hard rules and
points into the vault; `CLAUDE.md` and `.cursorrules` `@`-import it.

**Why.** Dense spec files at the root duplicated the vault's content as terse
specs, and the two would drift.

**When building.** Put documentation in the vault and link to it. Keep the root
shims consistent with it — they are the first thing every agent reads.

---

## ADR-0005 — Use standard `next/link` for navigation

**Status:** Accepted · 2026-05-21

**Decision.** Standard Next.js navigation — `<Link>` from `next/link`,
`useRouter` from `next/navigation`. The custom `<AnimLink>` / `useAnimRouter()`
convention referenced in early drafts is dropped; it was never built.

**Why.** Two conflicting conventions existed in the docs and only one had code.

**When building.** No animated route-transition layer exists. If one is needed,
revisit with a new ADR rather than reviving the old names. See [[routing]].

---

## ADR-0004 — Tailwind v4 with CSS-based config

**Status:** Accepted (starter baseline) · amended by ADR-0012 and ADR-0015

**Decision.** All theme configuration lives in `globals.css` under `:root` and
`@theme inline`. There is no `tailwind.config.js`. Raw values in class names are
banned.

**Why.** Tailwind v4 removes the JS config file in favour of CSS-native config.

**When building.** Design tokens are the only styling currency: a value that does
not exist as a token gets added to `globals.css` first — following the three-tier
grammar (ADR-0015) — and component-specific *classes* do not go there at all
(ADR-0012). See [[design-system]].

---

## ADR-0003 — Routes delegate to Views

**Status:** Accepted (starter baseline)

**Decision.** `app/**/page.tsx` only imports and renders a component from
`src/views/`. All layout and UI logic lives in the view.

**Why.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**When building.** Every route is a ~3-line file; views are the real page
components. `verify.sh` FAILs on a route importing anything else. See [[routing]].

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

**Status:** Accepted (starter baseline) · amended by ADR-0014 and ADR-0009

**Decision.** Every animation uses `@react-spring/web` through the component
layer in `src/components/animation/springs/`. CSS keyframes and `framer-motion`
are **banned**. Text animation goes through `spring-text-engine`.

**Why.** Marketing sites need rich, interruptible, physically natural motion. CSS
transitions and keyframes are rigid; competing libraries add weight.

**When building.** The springs folder and `src/hooks/animation/` are
`#do-not-modify` — consume them, wrap them, never edit them without sign-off.
ADR-0014 narrows the CSS ban to allow `transition-*` for trivial hover/focus
state only. See [[animation-system]] and [[text-engine]].

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

**Status:** Accepted (starter baseline) · amended by ADR-0006

**Decision.** `obsidian/` is a linked, navigable vault documenting how the
project is built and why.

**Why.** Project knowledge scattered across root markdown files gave new
contributors and AI agents no structured map of the system.

**When building.** Docs are maintained alongside code — see [[meta/README]] for
the maintenance rules, and [[agent-harness]] for how the vault and `.claude/`
divide the work.
