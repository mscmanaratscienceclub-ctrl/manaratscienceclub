---
tags: [meta, changelog]
updated: 2026-09-25
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## 2026-09-25 — Registration gains a **Reference** field, paired to the school

The registration form now asks **who referred the participant**, from one of two
lists that depend on their school: 49 visiting-school contacts, or 14 Manarat
names. The field appears only once a school is chosen (for "not listed", once a
name is typed — until then there is no school to pick a list by) and is cleared if
the participant changes school to one the chosen name doesn't belong to.

**The pairing is enforced server-side, not just in the dropdown.** The list is
resolved from the participant's *resolved* school name through the same
`isManaratSchool` substring test the host-school Olympiad rate uses, so a typed
"not listed" school containing "manarat" groups with Manarat — and a name from the
wrong list is rejected rather than stored.

Both lists live in `stemfest-registration.ts` exactly as the club supplied them
and are exported alphabetically: 49 names is more than anyone scans, and Radix's
typeahead jumps by the visible label.

**`stem_fest_registrations` gained a `reference` column**
(`drizzle/add_stemfest_reference.sql`) — **run it in the Supabase SQL editor
before deploying this**, because the insert writes it and an un-migrated database
refuses the registration outright (the same ordering trap `total_fee` set). The
*name* is stored rather than an id, since neither list is stable between editions
and an old row must still read correctly. `NULL` covers both "filed before the
question existed" and "not referred by anyone": the form offers that as an escape
hatch — without it, a participant nobody referred could not submit at all — and
it is written as NULL so the club's lists never carry a name that isn't a name.

The admin table carries it in the expanded row, and the receipt echoes it back.

One thing worth knowing for the other selects: Radix labels a trigger from the
selected item, and items only mount when the list opens, so a value restored from
a saved draft renders a **blank** trigger. The reference field renders the name
directly to avoid that; `school`, `class` and `gender` still have the quirk.

---

## 2026-09-25 — Confirmation email links to `/syllabus`

The payment-confirmed email gained a **Before the day** section: "The syllabus
and rulebooks for every segment can be found on our syllabus page", with a
`Syllabus & rulebooks` button pointing at `/syllabus` (opened in a new tab).

**The link is absolute and refuses to point at localhost.** `.env` sets
`NEXT_PUBLIC_BASE_URL=http://localhost:3000`, and a receipt in someone's inbox
linking to localhost is a dead end they cannot fix — so a loopback value is
discarded in favour of `https://manaratscience.club`, the same fallback
`sitemap.ts` uses. A staging build therefore links at production, which still
resolves.

An email is read away from the site, so a relative `/syllabus` was never an
option. The syllabus page links onward to the rulebooks (`/resources`), which is
why one link covers both in the wording.

---

## 2026-09-25 — "You will receive an email shortly after you register"

Copy only, **no plumbing**: nothing in the app emails a participant on submit, and
the club sends this mail by hand. That is why the line names no sender and no
timetable — if it is ever changed to promise a schedule, the sending has to be
built first. `stemfestFormCopy.emailNotice` renders in two places: the form's
summary sidebar (above the payment disclaimer, so it is visible before
submitting) and the receipt the participant lands on straight after.

---

## 2026-09-25 — `/syllabus`: segment syllabi served from the Supabase `pdfs` bucket

**New public route `/syllabus`** listing every segment's syllabus, with PDFs
served straight from Supabase Storage. Discovery is a **Syllabus** card on
`/resources` (+ a *Syllabus PDFs* link inside each segment's reserved panel), a
footer link under *Get Involved*, `publicRoutes` and the sitemap.

`src/lib/media.ts` gained **`PDFS_BUCKET = "pdfs"`** and **`pdfUrl(path, { download })`**
— the existing public bucket the club already uses, not a new one. It
percent-encodes each path segment, because the club's object keys are the
filenames they uploaded (`MATH OLYMPIAD SYLLABUS.pdf`) and a raw space in a URL
is invalid; `download` appends `?download`, which makes Supabase answer with
`Content-Disposition: attachment` so a Download link saves instead of opening
the viewer.

**The rows are derived, not authored.** `src/lib/data/syllabus.ts` maps
`stemfestSegments` for the section order and filters `stemfestEvents` for one row
per event, so an event renamed on the registration form is renamed here and the
two can never disagree. Each row's coverage line is computed from the event's
own category rules and class lists ("Categories A–E · Class 3 – A2/12"), which is
why moving a category boundary in the catalogue moves the line on this page.

**Publishing is one line.** `publishedSyllabi` maps an event id to its object key
in the bucket; four Olympiad syllabi (Mathematics, Physics, Bio-Chem, General
Science) are already live and carry their real upload date, and the other eight
rows render as dashed reserved space rather than dead links until the club
releases them. The header counts what is actually published — currently `04 / 12`.

Hard rules touched: none bent — Server Component, no new dependency, tokens only.
`tsc`/`lint`/`build` clean, `verify.sh` 0 FAIL (4 pre-existing WARNs), `/syllabus`
prerenders static.

---

## 2026-09-22 — Host-school Olympiad rate, `total_fee` on the row, manual confirmations

**The Olympiad tier charges a host-school student ৳350 for the first event
instead of ৳400** (`stemfestFees.olympiadFirstManarat`). Later events stay at
৳350, so they pay ৳350 per event. It is **never named in copy** — the fee summary
simply adds up lower. The predicate is `isManaratSchool()`, a case-insensitive
substring test on the *resolved* school name, because the form stores the
participant's own words for a school chosen through "not listed" and an equality
test would miss them.

The itemised Olympiad line in the fee summary no longer spells out
"first 400, then 350 each": it prints the count alone. Repeating the tier there
would have printed a number that is wrong for a discounted registrant and handed
them the difference to notice. `pricingNote` (the hint under the segment
heading) still quotes the standard rate to everyone.

**`stem_fest_registrations` gained a `total_fee` column**
(`drizzle/add_stemfest_total_fee.sql`) — the amount the club *asked* for, as
opposed to the amount a forwarded bKash SMS reports, which is what the panel
could already show. The Server Action recomputes it from the catalogue on insert
and never reads it from the browser, so it matches the form's sticky summary by
construction. The admin table shows it as an **Amount** column and in the
expanded row as *Amount to send*; `/admin/science-competition` gained an **Amount
to Collect** stat card (Σ `total_fee`), and the printed report an `amountToSend`
column. Rows filed before the column existed have `NULL` and render as `—`.

**Verifying a payment no longer emails the participant.** A decision and a
message are two separate acts now: recording `verified` writes the decision and
stops, and the receipt goes out only when an admin presses *Send confirmation* on
the row. Clearing a queue of payments used to email every one of them before the
list could be checked. Same delivery behind both, so the message is unchanged;
`resendStemfestPaymentEmail` is the only caller of `deliverConfirmation`.

---

## 2026-09-21 — Computer Science olympiad re-categorised A/B/C

`computer-science` previously split **Junior (7–9) / Senior (10–A2)** — the
only event with a named split. It now uses the same lettered convention as the
other olympiads: **Category A (7–8) / B (9–10) / C (AS–A2)**, matching Physics
and Bio-Chem exactly. Class 9 moved from Junior to **B**, class 10 from Senior
to **B** (was Senior). Categories stay derived server-side from `classId`;
legacy rows with `categoryId: "junior"/"senior"` still render — `describeEntry`
falls back to the stored id when no current rule matches.

---

## 2026-09-21 — `/rules` replaced by the official guidelines letter; bKash numbers swapped

**The rule-card page is gone.** The club issued an official *"STEM Fest 2026 –
Dress Code & Identification Guidelines"* letter, and `/rules` now renders it
verbatim as a plain document: intro line, four audience sections (**MDIC
Students & Participants / Non-MDIC Student Participants / Private Candidates /
Parents & Visitors**), closing thanks and the Organising Committee sign-off.
No cards, no icons, no alert tones. `event-rules.ts` changed shape from rule
groups to `dressCodeGroups` + `eventRulesCopy`; the page is its only consumer.

**Consequently the operational rules are no longer on the site**: check-mail
for participant ID, no illegal contraband, phones allowed, exit policy,
lunch/prayer breaks, Gate 1, participant ID after verification. The pointer
copy on `/register`, `/resources` and the registration form now says "dress
code and identification" instead of "dress code and venue".

**bKash display order swapped**: `stemfestPaymentCopy.merchantNumber` is now
`01718446955 or 01911499865` — the 017 number is shown first. Both are sent to
in either order.

---

## 2026-09-21 — Rules rewritten; participating-school list published

**The `/rules` text was replaced with the club's current wording.** Dress code
keeps its three lines; *Further instructions* now leads with **check your mail
for your participant ID (check spam)**, then contraband, phones, exit, breaks,
Gate 1 and the participant-ID line — seven rules, ten in total.

- **Two rules were dropped** in the new set and are gone from the page: the
"no unauthorized items … smoking devices or narcotics" line (replaced by **no
illegal contraband** — vape, cigarette, lighter, pocket knife) and **"visitors
are welcome from 9:30 AM onwards"**, which the club no longer states. If either
was removed by accident, they are one entry each in `event-rules.ts`.
- **"Phones are allowed" is now its own rule**, not the chip that hung off the
contraband line — the `note` field is removed from `EventRule` and from the page
as a result, so there is no longer any chip rendering in the component.
- The contraband line remains the only `tone: "alert"` card.

**`stemfestSchools` now lists 29 schools** (`src/lib/data/stemfest-registration.ts`)
— the host school first, then the 28 the club supplied. The dropdown went from 1
option to 30 (the 29 plus *My school isn't listed*), so the select's scrollable
viewport matters now; verified it scrolls rather than clipping.

- **Ids are slugs, names are the stored value.** Nothing else changed: the school
is still written as the resolved name, and any school missing from this list can
still register through the escape hatch — the list is convenience, not a gate.
- The launch TODO that asked for this list is resolved and removed.
- **Spelling was normalised on the way in** (casing only, so `Dhaka City college`
→ `Dhaka City College`, `CANTONMENT PUBLIC SCHOOL AND COLLEGE SAIDPUR` →
`Cantonment Public School and College Saidpur`), with one substantive guess:
`Rajarbag Policaae Line School and College` → **`Rajarbag Police Lines School
and College`**, which looks like a typo for the real institution. Worth a glance
in case the club meant something else.

---

## 2026-09-21 — New `/resources` page; tooltip primitive; `/rules` CTA trimmed

**`/resources`** (`src/app/(routes)/(site)/resources/page.tsx`) is the home for
rulebooks and the practical detail that surrounds them. Two parts: a *General
information* row (Event rules, Registration & fees, Schedule, Venue & directions
— the first two link to real pages, the other two render as "Details coming
soon"), and a *Segments* index listing every fest segment with its event names.

- **The segment names and their item lists are not retyped.**
`src/lib/data/resources.ts` maps over `stemfestSegments` from `stemfest.ts` (the
array the homepage hero reads), so all five segments — Olympiads, Robotics,
Project Display, E-sports, Fun Segment — appear with exactly the event names the
rest of the site uses. Renaming a segment in the catalogue renames it here.
- **The detail slots ship empty.** Each entry carries `details: null` and
`files: []`, which the page renders as a dashed "reserved space" panel with a
placeholder line. Publishing a rulebook means filling one field — the TODO on
`resourceEntries` says exactly what to push. Nothing is invented in the meantime:
a slot with no file is labelled, not rendered as a dead link.

**A rules pointer sits under both chooser cards** on `/register` — one bordered
strip reading *Event rules — dress code, what may be brought through the gate,
entry timing and where to enter*, with a **Read the rules** link to `/rules`.
Deliberately shared instead of repeated inside each card (`registrationRulesLink`
in `register-choices.ts`): the rules apply to participants and volunteers alike,
so putting them under one path would imply the other has none.

**New shared `Tooltip`** (`src/components/ui/tooltip.tsx`) built on Radix via the
existing `radix-ui` umbrella package — no new dependency. Dark-surface styling, a
150ms delay, and it is a *convenience* only: Radix wires `aria-describedby` from
the content to the trigger, so the same text is announced on focus, and every
trigger must be a real focusable element. First use is the **info button beside
each card title on `/register`**, whose copy (eligibility and what happens next)
lives in `register-choices.ts` alongside the rest of that page's wording.

**`/rules`** lost its secondary "Event schedule" button — the page ends on a
single *Register for STEM Fest* CTA.

`/resources` is in `publicRoutes`, `sitemap.ts` and the footer's *Get Involved*
column, next to Event Rules.

---

## 2026-09-21 — New `/rules` page: dress code and venue instructions

The fest's on-the-day rules had no permanent home — they lived in announcements and
in volunteer briefing notes. `/rules` (`src/app/(routes)/(site)/rules/page.tsx`)
now publishes them: **Dress code** (uniforms plus ID cards for participants,
MDIC visitors, and decent clothing for private students and other guests) and
**Further instructions** (no unauthorized items or narcotics with phones
explicitly allowed, visitors from 9:30 AM, participants free to leave at any
time, lunch and prayer breaks per schedule, Gate 1 for entry, and participant ID
issued after verification and worn at all times).

- **Copy lives in `src/lib/data/event-rules.ts`**, not in the component — two
groups of typed `EventRule` entries with an icon id, an optional chip note and an
optional `tone: "alert"`. Wording, order and grouping change there alone; the page
only maps over it, so a rule edit can never drift from what the page renders.
- **The prohibited-items rule is the only `tone: "alert"`**, which gives it the
solid-ion icon and tinted panel — it is the one rule with consequences attached.
`note: "Phones are allowed."` renders as a bordered chip inside that card rather
than as a separate rule, so the clarification cannot be read as one.
- **Reachable from the footer** (`Event Rules` under *Get Involved*), from the
registration form's summary panel, and in `sitemap.ts`. Added to `publicRoutes`
in `src/routes.ts` so signed-out visitors can read the rules before registering.
- Standards: the reveal animation is the shared `ScrollReveal` (GSAP, honours
`prefers-reduced-motion`); no new dependency, and no chart or animation library.

---

## 2026-09-21 — `/register` is a chooser again; the volunteer form returns

The 2026-09-19 retirement replaced `/register` with a 308 to `/stemfestreg`, so
anyone arriving with the old link — or clicking the navbar's **Register** — was
sent straight into the STEM Fest event form with no way to reach the volunteer
application. `/register` now renders a real page again: two cards, one for the
event registration and one for volunteering.

- **The redirect is gone.** The `permanentRedirects` map (and its only entry)
is removed from `src/proxy.ts`; `/register` and the new `/volunteer` are added to
`publicRoutes`, so both render for signed-out visitors ahead of the auth gate.
Both are back in `sitemap.ts`.
- **The chooser** (`src/app/(routes)/(site)/register/page.tsx`) reads its copy
from the new `src/lib/data/register-choices.ts`. The volunteer card carries a
**bold solid-ion badge reading `MANARAT ONLY`** plus a plain-language
eligibility line — the restriction is a hard rule, so it is stated on the card
rather than buried in the form. The STEM Fest card is marked "Open to all".
CTAs are pinned to the card floor (`mt-auto`) so both buttons sit on the same
line whatever the copy length.
- **The volunteer form is restored verbatim** from the retired commit, at
`src/app/(routes)/(site)/volunteer/` — `volunteer-form.tsx` (draft autosave,
progress rail, submitted receipt), `volunteer-actions.ts` and
`volunteer-validate.ts`, with `src/lib/data/volunteer-form.ts` recovered from
git history. It writes to `volunteer_registrations` exactly as before, through
the shared `getSupabaseAdmin()` server action. The only edit to the original is
an unused `label` parameter dropped from `answerField` (the message already
reads `min`), plus import paths.
- **Shared form primitives.** `form-primitives.tsx` / `form-storage.ts` moved
under `stemfestreg/` when the old `register/` folder was deleted; the volunteer
form now imports them across the folder (`../stemfestreg/…`) rather than
carrying a second copy. The docstring was updated to name both consumers.
- **Entry points.** The navbar **Register** buttons (desktop and mobile) now
point at `/register` — the chooser — while the hero CTA, which names STEM Fest
explicitly, still goes to `/stemfestreg`. The footer's "Get Involved" column
gains **Register** and **Volunteer** links.

**Verified.** `tsc --noEmit` and `pnpm lint` clean; `pnpm build` green with
`/register` and `/volunteer` in the route list; `verify.sh` 0 FAIL (4
pre-existing WARNs); live preview — `/register` and `/volunteer` both render,
the `MANARAT ONLY` badge computes to `bg #ff7053 / text #0a0605 / weight 700`,
both card CTAs point at `/stemfestreg` and `/volunteer`, and the volunteer form
mounts all four sections with no console errors.

## 2026-09-20 — Admin dashboard carries charts and real statistics; panel given a design pass

The admin landing page (`/admin`) showed four number cards and one table, all of them counting the ambassador form alone — a club running three forms had no view of the whole. It now plots the data it already had and reports figures that were previously invisible.

**New figures.** `getStemfestStats` gained `amountCollected` — the sum of the amounts on the *matched* bKash messages, summed only over rows that read `verified`, through the same fragments the status pill and the filter use. It is text, and `null` when nothing is verified or when verified rows have no matched amount; the card renders those two cases differently (a real `৳0` versus an em dash with an explanation), because "no money" and "amount not recorded" are not the same answer.

**New actions** in `src/lib/actions/registrations.ts`:

- `getRegistrationTrend(days)` — daily counts across all three forms, grouped by the **Dhaka** calendar day (`at time zone 'Asia/Dhaka'`), with the gaps filled from `recentDayKeys` so an empty day is a real zero rather than a missing bar.
- `getDashboardBreakdown()` — the volunteers tally, the recent feed, event popularity and the school league table, in **one** action with four sequential reads.

**Why bundled.** `src/db/index.ts` documents that more than four simultaneous sources makes Supavisor lose responses, and the dashboard was already the widest caller at four. Rather than add three more actions and cross that line, the secondary figures share one action and run sequentially inside it; the dashboard still fires exactly four `allSettled` sources. `getVolunteerCount` and `getRecentAmbassadorRegistrations` were folded in and removed rather than left as a second copy of the same reads. `scripts/verify-admin-db.ts` — the pooler concurrency harness — was updated to mirror the new four-source shape and the two new query forms (a values-list join for event popularity, a union plus a `count(*) over ()` window for schools).

**Charts are dependency-free.** `src/components/admin/charts.tsx` adds a sparkline, a stacked bar chart, a donut and a ranked bar list, hand-built from SVG and CSS grid. No charting library was added: the three shapes needed are small, and every one of them reads the design tokens directly instead of carrying a second palette. Chart colours come from `chartToneVar` in the new `src/lib/admin/dashboard.ts`, which also owns the trend series and the day-key helpers — the presentation contract both the actions and the components share, in a plain module because a `"use server"` module may only export async functions (`DASHBOARD_TREND_DAYS` lives there for that reason, like `REPORT_ROW_LIMIT` in `admin/filters.ts`).

**Design pass** on the panel page: KPI cards with a tone hairline, a tinted icon and a sparkline; one `Panel` shell so every section shares a heading treatment; numbered figures in `tabular-nums`; hover lift and `focus-visible` rings on the entry-point cards; a real empty state per panel; and a "Skip to content" link in the admin layout (`sr-only` until focused) — the sidebar is a dozen links deep and precedes the content on every page. The loading skeleton was rebuilt to mirror the new layout so the page no longer reflows when data lands.

**Two bugs the probes caught, both worth remembering** (they were invisible to `tsc`, `lint` and `build` — only the database caught them):

- **`date - $1` returns an integer, not a date.** With a bare bind parameter, Postgres resolves the operator to `date - date` and returns a day *number* (verified against the live database: `20716`, not `2026-08-22`). Every `since` figure would then have been compared against a date. Fixed with `::int` on the parameter.
- **`group by` does not match a re-interpolated expression.** Drizzle emits a fresh bind parameter for each interpolation, so `to_char((created_at at time zone $2)::date, …)` in the select list and `… at time zone $3 …` in the `group by` are *different parse trees*, and Postgres rejects the query with `column "…created_at" must appear in the GROUP BY clause`. Fixed by projecting the local day in a subquery and grouping on its plain `day` alias.

**Verified.** `tsc --noEmit` and `pnpm lint` clean; `pnpm build` green; `verify.sh` 0 FAIL (4 pre-existing WARNs); all new SQL statements run against the live database through throwaway probes (since deleted) — both with literals and with the real bind-parameter shapes, covering the trend buckets, the values-list event join, the union/window school ranking, the amount aggregate and the `LIMIT` parameter; the chart components were checked visually through a throwaway public route, also deleted.

One thing the probe exposed and this entry records: the school ranking groups by `lower(btrim(school))`, which the ambassador form's **free-text** school field makes noisy — "MDIC", "manarat dhaka" and "Manarat Dhaka International School & College" count as three schools. The figure matches the existing `uniqueSchools` definition rather than inventing a second one, and the panel now says "as typed"; normalising the ambassador school field against the catalogue would fix the number properly.

## 2026-09-20 — University is Robotics-only; Robotics returns to the homepage hero

Two catalogue changes, both reversing or narrowing earlier decisions.

- **University competes in Robotics alone.** The E-sports bracket was built from `everyClass` — every class in `stemfestClasses`, university included — so a university registrant could enter EA FC 26, Clash Royale and Bedwars. That list is now `openBracketClasses` (the same set **minus university**), so E-sports is closed to it while Robotics keeps `university` in `roboticsClasses`, the only place it appears. `eligibleSegmentsForClass("university")` now returns Robotics alone; Class 12 and below are unaffected.
- **Robotics is back in the homepage hero.** `src/lib/data/stemfest.ts` — the tesseract dive sequence on the main index page — had dropped Robotics when the segment was removed from STEM Fest on 09-14 (per [[decisions-log]]), leaving Olympiads, Project Display, E-sports and Fun Segment. Robotics is restored at index 02 with **Robosoccer** and **Line Following Robot** as its items, exactly as Olympiads lists its five arenas, and the later segments renumbered (Project Display 03, E-sports 04, Fun Segment 05). The hero array is deliberately separate from the registration catalogue and remains free to describe segments that aren't open for registration.

Verified: `tsc --noEmit` and `pnpm lint` clean; `pnpm build` green; `verify.sh` 0 FAIL (4 pre-existing WARNs); `eligibleSegmentsForClass` checked behaviourally for university, A2 and Class 7.

## 2026-09-20 — Team forms collect every teammate's email and school; real bKash number wired in

Two follow-ups to the STEM Fest registration flow (`/stemfestreg`).

- **The bKash number is real.** `stemfestPaymentCopy.merchantNumber` was a `01XXXXXXXXX` placeholder (with a `TODO(before launch)`) — participants are shown it verbatim and send money to it. It is now **`01911499865`**, and the TODO is gone.
- **Team forms now ask for every teammate's name, email and school.** Team entries stored teammates as a bare `string[]` (`entries.teammates`), which was enough for a roster but nothing the club could mail or print a certificate from. Each teammate is now an object — `{ name, email, school }` (`StemfestTeammate` in `src/lib/data/stemfest-registration.ts`) — and `TeamDetails` renders three inputs per slot, with all three required for every slot below the chosen team size. Emails are lower-cased like the registrant's, so the two agree wherever they are compared or sent to.
- **The receipt lists the roster.** Each teammate prints their name with school and email beneath it. `normalizeTeammate()` reads both shapes, so an entry (or a receipt cached in localStorage) written before this change still renders rather than crashing on a string that has no `.name`.

Draft hydration moved into `restoreStemfestDraft()` in the form's `validate.ts`: a draft saved before the email/school questions existed holds bare teammate strings, so it is now normalised slot-by-slot into complete objects and can never fail validation on a shape the form itself wrote.

Verified: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean; `verify.sh` 0 FAIL (4 pre-existing WARNs).

## 2026-09-19 — Payment-confirmation email rebuilt as a full receipt

The verified-payment email carried only a TrxID, an amount and the event list — a participant forwarding it to a parent had no proof of *who* had registered or for *what class*. It now carries the whole registration:

- **Registration ID leads** (`M7001`), in a tinted hero block with a "quote this at check-in" line; the subject line carries it too (`Payment confirmed — M7001 · STEM Fest, …`), so the receipt is findable in a mailbox by the ID the club asks for.
- **Participant table**: name, class (resolved through `getStemfestClassLabel`), school, and phone. The row has no separate contact-phone column, so the email prints the bKash wallet number for both — it is the number the form collected.
- **Payment section**: TrxID and bKash number in monospace, amount (when a forwarded SMS reported one), plus **Registered on** (row's `created_at`) alongside **Confirmed on** — both formatted in `ADMIN_TIME_ZONE` by the same `Intl.DateTimeFormat`.
- **Events** unchanged (`describeEntry` output, team names in quotes), footer now notes that one registration covers a whole team.

Plumbing: `stemfestDecisionSelection()` — the columns read inside the decision transaction — selects the new fields, so the email quotes the stored row rather than anything the browser held; `deliverConfirmation` maps them to `sendPaymentVerifiedEmail`'s widened options. `registrationCode` and `submittedOn` are optional, so a legacy row predating the ID trigger still sends (no ID block, no registered-on line) rather than failing verification. The template's HTML structure and escaping are unchanged.

Verified: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean; the rendered email was previewed in a throwaway route and every field checked in the DOM before the route was deleted.

## 2026-09-19 — Robotics returns as a team segment; team names on every team event; every response now gets a registration ID

Three changes to the STEM Fest registration flow (`/stemfestreg`), two of which reverse the 2026-09-14 removal.

- **Robotics is back, with LFR and Robosoccer as its events.** Both are `teamBased` with no category split (`categoryId: null` — the classes list is only an eligibility gate, Class 7 → University), priced by the segment's `pricing: "team"`: **৳1,500 for a team of 4, ৳2,000 for a team of 5** — the same `teamFee()` constants Project Display reads, so the fee maths needed no new code. The homepage hero (`src/lib/data/stemfest.ts`) was left alone deliberately: that file describes segments the fest *runs* and is free to disagree with what registration accepts. The page `<title>` mentions Robotics again.
- **Every team event now takes a team name.** The field existed end-to-end in the data layer, schema and trigger (`entries.teamName`, optional, ≤60 chars, stored as `null` when blank) but the form never rendered an input. `TeamDetails` now shows it first in every team block, with the catalogue's label/hint/placeholder. Receipts and the admin table's `segments` column show it via `describeEntry` (`Team "…"` in quotes, so it never reads as a catalogue label).
- **Every response now gets a human ID: `<GENDER><CLASS><NNN>`.** Gender letter (`M`/`F`/`O`, `X` for rows with no gender on file) + class code (`class-7` → `7`, `as` → `AS`, `university` → `U`) + a zero-padded counter that restarts per prefix: the first Class-7 boy is `M7001`, the next `M7002`, the first A-Level girl `FAS001`. The counter lives in a new `stem_fest_registration_counters` table; the bump is a single `insert … on conflict do update … returning`, so two simultaneous submissions serialise on the row lock instead of both reading the same "last number" — a `max()+1` in the Server Action would produce duplicate IDs under exactly the load a registration day creates. It is a `before insert` **trigger** (`drizzle/add_stemfest_registration_ids.sql`, idempotent, with a backfill for existing rows) rather than application code because the form writes through the Supabase client, an admin can insert from the SQL editor, and the SMS forwarder writes rows of its own — a trigger covers every path. Existing IDs are never renumbered; the unique index makes "every response has an ID" a property of the database, not a hope about the app. **Manual step: run `drizzle/add_stemfest_registration_ids.sql` in the Supabase SQL Editor before deploying** — the form's action selects `registration_code` on every submission, so an un-migrated database makes the form fail outright.
- **The form asks for a gender**, which the ID's first letter is derived from — the field existed in the schema and validation but had no input. It sits between school and class, and the ID hint under it explains what it is for.
- **Surfaces updated:** the receipt leads with the minted ID (falling back to the row uuid for receipts cached before the trigger existed); the admin table gained an ID column (monospace, first column) and shows it in the expanded row; the printed report leads with it; the admin search covers it.
- Verified: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` (with placeholder env — no `.env` in the workspace), `.claude/scripts/verify.sh` 0 FAIL / 4 pre-existing WARNs, and a throwaway Node script asserting the catalogue, eligibility, fees, team-name plumbing, validation and fee summary (15/15).

## 2026-09-19 — Project Display team-of-4 fee drops to ৳1,500

`stemfestFees.teamOfFour` 1600 → 1500. Team-of-5 stays at ৳2,000, so the two
sizes are now ৳1,500 / ৳2,000. One constant carries it: `teamFee()` (what the
row is charged) and `pricingNote()` (what the page shows) both read it, so the
quoted price and the stored `total_fee` cannot drift. Rows already filed keep
the total they were written with — history is not rewritten.

Note for anyone reading this alongside the request that prompted it: it came in
as "the robotics/project display price". Robotics left STEM Fest on 2026-09-14
(below), so Project Display is the only team-priced segment left and this is the
only fee it has.

## 2026-09-19 — Ambassador & Volunteer forms retired; `/register` redirects

The public application forms are gone; the stored responses and the admin
screens that read them are untouched.

- **`/register` no longer renders anything.** The Campus/Batch Ambassador form,
  the Volunteer form, the programme selector, both server actions and both zod
  schemas are deleted, along with `src/lib/data/volunteer-form.ts` (the question
  catalogue that only the volunteer form read). The route directory is gone.
- **`/register` → `/stemfestreg`, 308.** Handled in `src/proxy.ts` via a
  `permanentRedirects` map, checked before the auth gate, so the entry in
  `publicRoutes` was removed as dead. Put here rather than in
  `next.config.ts` because redirects are proxy work by convention
  (`.claude/rules/routing-views.md`) and because this ordering is explicit
  rather than relying on where config redirects sit relative to the proxy.
  `/stemfestreg` stays the canonical URL — it is the one on printed material.
- **The shared form primitives moved.** `form-primitives.tsx` and
  `form-storage.ts` lived under `register/` and were imported across the folder
  boundary by the STEM Fest form. They now sit in `stemfestreg/` beside their
  only remaining consumer; the three `../register/…` imports became `./…`.
- **The admin table kept its type.** `admin/campus-ambassador/registrations-table.tsx`
  imported `AmbassadorType` from the deleted `register/validate.ts`; it now
  derives it from `CampusAmbassadorRegistration["type"]` in the Drizzle schema —
  the table the historical rows actually live in.
- **Link hygiene.** The footer's "Campus Ambassador" entry is removed; the navbar
  and hero CTAs (both labelled for STEM Fest, both previously pointing at the
  ambassador page — a live mislink) now go straight to `/stemfestreg` rather
  than through the redirect. `/register` is out of the sitemap.

## 2026-09-14 — STEM Fest drops Robotics; the registration form asks for a school

Four content/UX changes to the STEM Fest surface, plus the data decision behind
the new field (ADR-0030).

- **Robotics is gone from STEM Fest.** The segment and its three events
  (Robosoccer, LFR, Roborace) are out of the registration catalogue
  (`stemfestSegments` / `stemfestEvents` in `src/lib/data/stemfest-registration.ts`),
  out of the homepage hero dive (`src/lib/data/stemfest.ts` — the remaining four
  segments were renumbered `01`–`04` so the on-screen indices stay contiguous),
  and off the page `<title>`. `StemfestSegmentId` lost `"robotics"` too, so a
  stray `segmentId: "robotics"` is now a type error rather than a silently
  unfetched row. A returning visitor's saved draft that still holds `roborace`
  is *pruned* rather than submitted: `buildEntry` returns `null` for an unknown
  event id, so `buildEntries` drops it and the class-eligibility re-check runs as
  before. Rows already filed keep the segment text they were written with —
  `segments` is a denormalised string, so history is not rewritten.
- **"STEM Fest" left the navbar.** `src/components/home/msc-nav.tsx` now reads
  Home · Members · Research; the mobile drawer numbers itself from the array
  index, so it renumbered itself. The footer link and the `/stemfestreg` route
  are untouched — the page is still reachable and still linked.
- **The form asks for a school.** `stem_fest_registrations.school` was `not null`
  and existed already, but every row was written with the host school hardcoded
  in `actions.ts`. It is now a real dropdown fed by `stemfestSchools`, with a
  **"My school isn't listed"** option (`STEMFEST_OTHER_SCHOOL_ID`) that reveals a
  free-text input. See ADR-0030 for why the id is what the form carries and the
  *name* is what the row stores.
- **TODO(before launch):** `stemfestSchools` holds only the host school until the
  club supplies the participating-schools list. Adding one `{ id, name }` per
  school is the whole change — nothing else reads that array.
- Verified: `pnpm exec tsc --noEmit` and `pnpm build` clean (the build
  type-checks), `.claude/scripts/verify.sh` 0 FAIL, and a throwaway script
  asserted the catalogue, eligibility, school resolution and fee maths
  (10/10) — including that a stale `roborace` pick is dropped.

---



## 2026-09-14 — Transactional email: the sender identity was wrong in two ways

A verified bKash payment produced a confirmation mail that arrived as
`Manara Science Club <onboarding@resend.dev>` — the club's name was misspelled
(the real name is *Manarat*, with a `t`) and the `From:` address was Resend's
sandbox one, not the club's.

- **Cause, second part:** `EMAIL_FROM` was set in no environment — only
  `RESEND_API_KEY` sits in `.env`/`.env.local` — so the hardcoded fallback in
  `src/lib/email/resend.ts` was what every send actually used, and that fallback
  was the sandbox address.
- **Cause, first part:** the brand name was copy-pasted as a literal into 14
  places (3 templates × title/header/footer + 4 subjects), so it drifted from
  `siteConfig.name` and nobody noticed.
- **Fix:** all three templates (`verification-email`, `reset-password`,
  `payment-verified`) and every subject now read `siteConfig.name` from
  `src/lib/data`, and `EMAIL_FROM` falls back to
  `` `${siteConfig.name} <${siteConfig.email}>` `` — i.e.
  `Manarat Science Club <info@manaratscience.club>` (hard rule #3: config lives
  in one place). `EMAIL_FROM` is now actually set in `.env` / `.env.local`, and
  `env.example` + the README table document the value and the constraint below.
- **Still required outside the code:** `manaratscience.club` must be added and
  DNS-verified in Resend → Domains, and `RESEND_API_KEY` must not be a
  test-mode key (a test key may only send to the account owner's own address).
  Until then Resend refuses the send — which is the intended behaviour, and the
  reason the old fallback (silently sending from `resend.dev`) was removed.

---


## 2026-09-14 — Admin panel: one filter contract, four tables, and a report that prints what you filtered

All four admin tables — Campus Ambassador, Science Competition, Volunteer and SMS
Logs — now filter, sort and export the same way, and each has a printable report
that honours the filters it was opened with. Documented in
[[admin/filters-reports]]; the decision is ADR-0029 in [[decisions-log]].

- **`src/lib/admin/filters.ts` is the whole contract.** An `AdminSourceConfig`
  per source declares its filter fields, their kind (`text`/`select`/`date`/
  `number`), sort options, all the copy and its report columns. The filter bar
  renders from it, `parseAdminQuery` validates the URL against it, and the report
  route re-parses the same query string — so table, chips, empty state and PDF
  cannot drift apart. A component no longer knows what a filter *is*.
- **A change is applied to the state already in flight.** The server only renders
  the new state when its round trip finishes, so two changes inside one round trip
  (two filter picks, or a pick plus a debounced search term) each used to derive
  from the state before either and the second silently dropped the first. The hook
  now composes onto the state it has already sent while `isPending` is true, which
  is also the signal that the sent state has been rendered.
- **Every table is filtered and sorted server-side.** The WHERE builders live in
  `src/lib/actions/registrations.ts` beside the queries, and the report runs the
  same builders with the paging removed. Before this, the "export" was a
  client-side print of whatever happened to be on screen and could silently
  ignore a filter.
- **The search box is no longer per-page state.** `q`, `sort` and `page` live in
  the URL, so a filtered view is linkable and reloadable. `DEFAULT_SORT` is left
  out of generated links and filter values are emitted in sorted key order, so an
  href describes the filter *set* rather than the order it was assembled in —
  which is what stops the search box re-navigating forever, since the hook's
  no-op guard compares hrefs as strings. (Building the href from the caller's
  object order made the same filters serialise as `?school=x&type=campus` from
  the hook and `?type=campus&school=x` once the page parsed them back.)
- **Date filters stopped being off by a day.** Bounds now convert through
  `ADMIN_TIME_ZONE` (`Asia/Dhaka`) in one place; previously a bare date was read
  as UTC, splitting a Dhaka calendar day at 6am local.
- **`/admin/reports/[kind]` prints the filtered set**, not the page: heading,
  resolved filter list, row count, sort and a server-formatted table. Capped at
  `REPORT_ROW_LIMIT` (2 000) with a visible notice when it truncates — a report
  reads every matching row, so it needs the bound the paged table does not, or an
  unfiltered export of an unexpectedly large table would pin a pool connection
  until the statement timeout.
- **Printing is CSS, and the shell declares itself.** `data-print` attributes on
  the admin layout, the sidebar and the report page drive a new `@media print`
  block in `src/app/globals.css`, with the sizes as tokens (`--print-page-margin`,
  `--print-title-size`, `--print-body-size`, `--print-cell-padding`,
  `--print-rule`). The admin shell is a fixed-height scroll viewport, so without
  unwinding it a long report is clipped at the fold and every page after it
  prints blank. No PDF library was added.
- **STEM Fest payment status is resolved in SQL** by the same `EXISTS` the
  `payment` filter uses. It used to be computed in JS from a second query for the
  TrxIDs on the current page — which could only answer for rows already fetched
  and left the filter itself impossible to express.
- **A failing source degrades instead of blanking a page.** Admin pages that read
  more than one source use `Promise.allSettled` + `unwrap`
  (`src/lib/admin/source-status.ts`): the failed figure renders as `—` and files
  one Sentry exception, because a missing number and a real zero must not look
  the same.


## 2026-09-14 — SMS forwarder, part 2: production sits behind Vercel's challenge, and the phone can no longer lose an SMS

Follow-on from the entry below, after the phone kept reporting "connection timed
out" against a route that answered `200` on a preview URL.

- **Production is unreachable for *any* API client — it is behind Vercel's Attack
  Challenge Mode.** Measured: `/`, `/robots.txt` and a nonsense
  `/api/webhooks/sms-nonsense-probe` all answer `403` with
  `X-Vercel-Mitigated: challenge`, identically, for curl's own UA, a desktop
  Chrome UA and an Android OkHttp UA. The edge answers *before* routing, so
  `X-Matched-Path` is absent from every response and the "404 — route not
  deployed" reading below can no longer be re-verified from outside (it may have
  been this same challenge rendered differently at the time). A browser challenge
  cannot be solved by an HTTP client, so on the phone this is either the `403` or
  a request held open until it times out, and both surface as "server
  unavailable". The fix is in the Vercel Firewall, not this repo: turn Attack
  Challenge Mode off, or better, keep it on and add a **bypass rule for
  `/api/webhooks/sms`**.
- **The route no longer relies on default routing behaviour.** `dynamic =
  "force-dynamic"` and `runtime = "nodejs"` are pinned. The forwarder retries the
  *same* request until it gets a verdict, so a cached `401` — or a cached `"ok"` —
  would be read as that verdict and silently stand in for work that never ran.
- **A missing `SMS_FORWARDER_SECRET` is now loud.** It still fails **open**, and
  deliberately so: a `401` makes the forwarder park a real payment SMS as failed,
  so tightening a live integration can itself destroy data. But the route now
  warns once per process and files one Sentry `warning`, because silence was the
  dangerous half — without the variable the ingest accepts any caller's POST and
  looks exactly like a healthy deployment.
- **The Android forwarder gained the rule this pipeline needed.** The app lives
  outside this repo (`android app/`, not version-controlled); its contract is in
  [[sms-forwarder]]. A **host-level** answer — the `403` challenge above, a Vercel
  HTML `404`, a dropped connection — is now treated as infrastructure, not as a
  verdict on the message: only the webhook's *own* JSON rejection marks an SMS
  `FAILED`, everything else stays queued and spends no retry budget. That
  distinction is what stops a misconfigured deployment from silently deleting real
  bKash payment SMS. The suite is now 52 tests (32 added here); disabling the
  interception detector fails 6 of them, so the rule is enforced rather than
  merely documented. See [[decisions-log]] (ADR-0028).

## 2026-09-14 — SMS forwarder: documented, and the ingest can no longer hang the phone

The bKash payment-SMS pipeline (`/api/webhooks/sms` → `stem_fest_payment_sms` →
TrxID match against `stem_fest_registrations` → `/admin/sms-logs`) had no note in
this vault at all. It does now: [[sms-forwarder]] — contract, phone-app config,
and the ordered checklist for the forwarder app's "connection timed out".

- **The ingest could hang forever.** The route's three database round trips ran
  unwrapped, i.e. outside `withDbTimeout()`. That is exactly the failure measured
  on 2026-09-13 (the pooler loses a response, the backend reads `idle`, nothing
  server-side can ever time out). To a phone it is indistinguishable from a
  network timeout, so the forwarder retries into the same wall. Reads and the
  insert now run in one `withDbTimeout("smsWebhookIngest", …)` transaction, and a
  failure answers **503** (retryable) with a Sentry event instead of a bare 500.
- **Duplicate rows on retry.** Retries only deduped when the forwarder sent
  `clientMessageId`. When it did not — the common case — every retry inserted
  another copy. The route now derives a stable id
  (`derived:sha256(sender|body|receivedAt)`) so a re-delivery collapses onto the
  existing row, and the insert is `ON CONFLICT DO NOTHING` + read-back so a
  lost-response retry returns the winner's row rather than a duplicate-key error.
- **Deployment gap, verified live:** production
  `https://manaratscience.club/api/webhooks/sms` returns **404**. The webhook, the
  parser and `/admin/sms-logs` exist only on branch `finalstemfestcaba`, not on
  `origin/main`. A phone pointed at production cannot succeed until that branch is
  deployed — with `SMS_FORWARDER_SECRET` set in the Vercel env vars.
- Still open: the endpoint **fails open** when `SMS_FORWARDER_SECRET` is unset
  (any POST is accepted and written to the database). Left as a follow-up rather
  than changing a live integration's behaviour.


## 2026-09-13 — Supabase audit: a live service-role key was in git, plus index + schema drift

Full write-up with measurements: [[supabase-audit-2026-09-13]]. Reproduce with
`node --env-file=.env scripts/db-arch-audit.mjs` (new, read-only).

- **A live `service_role` JWT was committed.** `drizzle/setup-ambassador-table.mjs`
  hard-coded a JWT byte-identical to the production `SUPABASE_SERVICE_ROLE_KEY`,
  in commit `93c7605`, pushed to GitHub. A service-role key carries `BYPASSRLS`,
  so it defeats every RLS policy in the project and can write to the `user`
  table (privilege escalation to CMS admin). The literal is removed and the
  script now reads `process.env` — **but the key still has to be rotated in
  Supabase and Vercel**, which is the only step that actually revokes it.
- **`drizzle-kit push` would have broken the SMS TrxID lookup.** The schema
  declared `stem_fest_payment_sms_trx_idx` on the plain column while the live
  index is on `upper(transaction_id)`. `pnpm db:migrate` would have dropped the
  functional index and created a plain one, silently turning the webhook's
  reconciliation into a sequential scan. Both sides now agree.
- **The webhook's own lookup had no index at all.** `stem_fest_registrations`
  was sequential-scanning `upper(transaction_id) = $1` — the one query on a
  public unauthenticated endpoint whose cost grows with registrations.
- Added the missing indexes for query shapes that were scanning and sorting:
  the published-posts listing (partial index), the CMS listing, and four
  foreign keys with no leading-column index (`posts.author_id`,
  `session."userId"`, `account."userId"`,
  `stem_fest_payment_sms.matched_registration_id`).
- `getSmsLogs` sorted by `received_at` while the only timestamp index was on
  `created_at`. Those diverge whenever the forwarder replays an offline backlog.
- Confirmed the security posture is otherwise sound: `public` **is** exposed via
  the Data API and `anon` holds `SELECT` on all 13 tables, but RLS returns `[]`
  for every one of them under the publishable key.
- Flagged four orphan `public` tables (`applications`, `form_fields`,
  `form_settings`, `form_submissions`) that no schema or migration knows about —
  `form_fields` and `form_settings` hold 12 and 2 rows of real data, so they
  need adopting or archiving rather than a reflexive `drop`.
- `avatars` bucket had no size/mime limits (enforced only in the upload route);
  remediation sets them on the bucket.

Remediation DDL (not yet applied): `drizzle/audit-2026-09-13-remediation.sql`.


## 2026-09-13 — Admin panel hang: root cause was pooler pipelining, not slow queries

- `/admin` "sometimes" failed with a network error / `57014 statement timeout`.
  It was **not** a slow-query problem: every `stem_fest_*` read measured ≤48 ms in
  `pg_stat_statements`. The cause was `postgres.js` **pipelining** — when a page
  load issues more statements at once than there are pooled connections, the
  extras are written onto an already-busy connection and Supavisor can drop the
  response. The backend then reads `state = idle` (the work is *finished*) while
  the client waits forever, which is exactly why no server-side timeout could
  ever rescue it. It looked random because it only happened when two page loads
  overlapped.
- **Pool `max: 3` → `5`** (`src/db/index.ts`), deliberately sized above the
  statements a single page load issues, with the failure mode documented in the
  file so the number is not "tidied" back down later.
- **New `src/db/query.ts` → `withDbTimeout(label, read)`** gives every admin read
  three guarantees in one place: a `SET LOCAL statement_timeout = '8000ms'`
  server-side cap, a 12s client-side watchdog for the case where the pooler never
  replies, and one retry. Server-side `statement_timeout` cannot be set at
  connection time — Supavisor **discards startup GUCs**, verified by probe — and
  must be `SET LOCAL` because transaction pooling may route each transaction to a
  different backend.
- **`src/lib/actions/registrations.ts` rewritten** around it: all seven actions
  wrapped, and the `Promise.all` (count + page rows) replaced with **sequential**
  statements inside one transaction — so the rows and their total also come from
  the same snapshot. `searchStemfestRegistrations`' verified-TrxID lookup is now
  bounded to the page's own transaction IDs instead of reading the whole table,
  and `getStemfestStats` folds its second query in as a scalar subquery.
- **Bug found while verifying: the retry never ran.** Drizzle wraps driver errors
  as `Error("Failed query: …")` with the real `PostgresError` on `.cause`, so
  `error.code` is `undefined` and every entry in `isRetryableDbError`'s retryable
  set was unreachable. It now walks the `cause` chain. `57014` was also removed
  from the retryable set on purpose: our 8s budget always beats the 12s watchdog,
  so retrying would double the wait to ~16s and fail identically.
- **Degradation instead of blanking.** New `src/lib/admin/source-status.ts`
  (`unwrap`, `formatCount`, `UNAVAILABLE`) applied to `/admin`,
  `/admin/science-competition` and `/admin/sms-logs`: one failing source now
  renders "—" plus an amber banner, rather than rejecting a `Promise.all` and
  taking the whole shell down with it.
- **New `pnpm db:verify`** (`scripts/verify-admin-db.ts`, run via
  `scripts/verify-admin-db.run.mjs` and the esbuild copy already in the store) —
  a live regression harness that drives the real `withDbTimeout` and Drizzle
  tables: the previously-hanging concurrency shape, four repeat rounds, the
  dashboard's four sources, real `statement_timeout` cancellation, and the retry
  decision per error class. All 25 checks pass. See [[decisions-log]] ADR-0026.
- **Action needed outside the repo:** set `idle_in_transaction_session_timeout`
  to `30000` in Supabase — it currently reads `0` (disabled), so an orphaned open
  transaction can pin a pooled connection indefinitely.
- Database diagnostics used during the hunt are kept under `scripts/`
  (`db-diagnose`, `db-concurrency-clean`, `db-hang-matrix`, `db-pool-stress`,
  `db-session-watchdog`, `db-slow-query-probe`, `db-timeout-probe`,
  `db-tx-timeout-test`) — all read `DATABASE_URL` and run with
  `node --env-file=.env scripts/<name>.mjs`.

## 2026-09-07 — Admin tables: server-side search + SQL pagination

- `/admin/campus-ambassador` and `/admin/volunteer` used to fetch **every** row
  (`getAllAmbassadorRegistrations` / `getAllVolunteerRegistrations`) and filter
  client-side with `useMemo`. Fine for a handful of rows, but it pulled the whole
  result set — including long `experience` text and all six volunteer answers —
  into the browser on every visit. A scaling risk for the STEM Fest surge.
- Now filtering + paging happen in SQL. New `searchAmbassadorRegistrations` /
  `searchVolunteerRegistrations` in `src/lib/actions/registrations.ts` run a
  case-insensitive `ilike` across the relevant columns (wildcards escaped via an
  `escapeLike` helper) plus a `count(*)::int` total, and return one page
  (`PAGE_SIZE = 25`, `orderBy desc(createdAt)`, `limit/offset`) with `totalPages`.
  The two fetch-all actions were removed.
- The pages read `searchParams` (Next 16 `Promise<{ q?, page? }>` idiom) and the
  client tables drive the query through the URL: new `useAdminSearch` hook
  (`src/lib/hooks/use-admin-search.ts`) debounces input (`useDebouncedValue`,
  `src/lib/hooks/use-debounce.ts`), `router.replace`s inside a transition
  (table dims while `isPending`), and resyncs on back/forward. New shared
  `src/components/admin/pagination.tsx` footer. Both routes are now dynamic (`ƒ`).
- Note: `"use server"` files may only export async functions, so `PAGE_SIZE` is
  internal and the actions return `totalPages` rather than exporting the constant.

## 2026-09-06 — DB pool `max: 1` → `3` + `max_lifetime` (local-dev freeze)

- Local dev kept freezing: every DB-backed route (`/`, `/blogs`, `/admin`) hung
  100s+ while non-DB routes (`/signin`, `/events`, static assets) stayed instant
  (~75ms). The queries were **not** the cause — a fresh `postgres` connection
  answered `select 1` in ~730ms (that's just Seoul `ap-northeast-2` pooler
  latency). A transient Supavisor blip (we caught one real `57014 canceling
  statement due to statement timeout`) wedged the app's **single** connection,
  and `src/db/index.ts` used `max: 1`, so every query queued behind the dead one
  until a manual restart.
- Fix: pool `max: 3` + `max_lifetime: 5min`. `DATABASE_URL` is the Supavisor
  **transaction** pooler (`:6543`), so a few client connections are cheap; one
  stuck connection can no longer block the whole app, and recycling self-heals.
- **Requires a full dev-server restart** to take effect — the client is cached on
  `globalThis`, so HMR re-imports reuse the old (wedged) instance and the new
  options never apply.

## 2026-09-06 — Admin dashboard: SQL aggregates + `created_at` index

- The `/admin` dashboard was fetching **every column of every row** from both
  `campus_ambassador_registrations` and `volunteer_registrations` on each load
  (long `experience` text and all six volunteer answers included), then counting
  and slicing in JS — cost grew linearly with applications. It now issues three
  fixed-size queries via `getAmbassadorStats()`, `getVolunteerCount()` and
  `getRecentAmbassadorRegistrations(5)` in `src/lib/actions/registrations.ts`
  (`count(*) filter (…)`, `count(distinct lower(btrim(school)))`, `limit 5`).
  Displayed numbers are unchanged; `getAll…Registrations()` still back the two
  list pages.
- Added `campus_ambassador_registrations_created_at_idx (created_at desc)`. The
  ambassador table lacked it while `volunteer_registrations` already had one, so
  every admin `ORDER BY created_at DESC` full-scanned and sorted. Mirrored in
  `src/db/schema/registrations.ts`.
- **Manual step:** run `drizzle/add_ambassador_created_at_index.sql` in the
  Supabase SQL Editor — the schema change alone does not create the live index.

## 2026-09-04 — Ambassador forms: contact & social questions

- Campus/Batch applications now collect **phone, email, gender, Facebook and
  Instagram** (phone/email/gender required; socials optional). Gender reuses the
  segmented pill control; a new numbered section `02 Social accounts` sits
  between details and experience, so field indices run 01–10.
- Schema: `drizzle/add_ambassador_contact_fields.sql` adds nullable
  `phone, email, gender, facebook, instagram` columns to
  `campus_ambassador_registrations` (nullable so pre-existing rows stay valid)
  plus a gender CHECK. Mirrored in `src/db/schema/registrations.ts`; the
  Supabase insert in `register/actions.ts` stores empty socials as `null`.
- Validation in `register/validate.ts` reuses the volunteer phone pattern;
  email uses `z.string().trim().pipe(z.email())` (Zod v4).
- Admin table (`/admin/campus-ambassador`) shows the new values in the expanded
  row and searches by phone/email. Older localStorage submissions without the
  new keys still render (fields are optional in `SavedSubmission`).

## 2026-09-01 — `/register` form: visual-only "dossier" variant

- The programme application form got a new look with **no logic change**: same
  Zod schema, same `submitAmbassadorForm` action, same per-type localStorage
  draft/submission keys, same `campus | batch | volunteer` discriminator.
- Layout is now an editorial split instead of one boxed card: serif display
  header, numbered sections (`01 Your details`, `02 Your experience`),
  underline fields with hairline rules that turn ion-coloured on focus, a pill
  segmented Yes/No control, a character-count progress bar, and a sticky
  progress rail whose checklist is derived from the existing `watch()` values
  (no new state).
- `ambassador-program-selector.tsx` is now a pill tab strip with the selected
  programme's description below it; `register/page.tsx` widened to `max-w-5xl`
  to give the split room.
- New presentation tokens in `globals.css`: `msc-field`, `msc-field-area`,
  `msc-btn-pill`, `msc-btn-pill-ghost`. Because Tailwind sorts custom
  `@utility` rules *before* standard ones, `fieldClass`/`fieldAreaClass` in the
  form repeat `border-0`, `h-auto`, `py-*` and `placeholder:*` as standard
  utilities so they win over the `ui/Input` and `ui/Textarea` base classes.

## 2026-09-01 — Volunteer applications on `/register`

- `/register` now offers a third programme — **Volunteer** — beside Campus and
  Batch Ambassador. It reuses the same Zod-validated form, the same per-type
  localStorage draft/submission state and the same submit action; only the
  persisted discriminator changes (`type = 'volunteer'`).
- `campus_ambassador_registrations.type` accepts a third value. Run
  `drizzle/add_volunteer_type.sql` in the Supabase SQL Editor **before
  deploying** — it replaces `campus_ambassador_registrations_type_check`.
  The Drizzle mirror in `src/db/schema/registrations.ts` was updated to match.
- The admin table's `type` union now comes from `AmbassadorType` in
  `register/validate.ts` instead of repeating the literals, and the
  "First-time CA" column is the generic "First time".

## 2026-08-30 — Supabase image pipeline: pre-optimised, zero transformations

- `scripts/optimize-bucket-images.mjs` (`pnpm images:optimize`, or
  `images:optimize:dry` to preview) re-encodes every bucket object referenced in
  `src/lib/data/index.ts` to WebP at 2x rendered size and uploads it under
  `optimized/` with a one-year `cache-control`. 23.5 MB → 0.85 MB across 31
  objects; `/legacy` drops from 17.7 MB to 0.66 MB. Originals are left in place.
- The 36 hardcoded `https://<project>.supabase.co/...` strings in the data
  module are replaced by `bucketImage()` from the new `src/lib/media.ts`, which
  derives the origin from `NEXT_PUBLIC_SUPABASE_URL`. `getPublicImageUrl()` is
  gone — it built a plain string through the service-role client.
- Blog author avatars and stored profile pictures route through Supabase's
  `/render/image/` endpoint (`renderedImageUrl()`) so Vercel is never asked to
  transform them. See [[decisions-log|ADR-0025]].
- `POST /api/upload` sets `cacheControl: "31536000"`; UUID-named uploads were
  inheriting Supabase's 1-hour default.
- The competition carousel no longer sends `priority` for below-the-fold slides,
  which was competing with the real LCP element.
- Fixed 6 `/memberimage/*.{png,jpg}` references left dangling by the in-flight
  WebP migration (they were 404ing); profile uploads are now 512 px WebP with a
  JPEG fallback where canvas WebP is unsupported.

## 2026-08-30 — Batch Ambassador registration

- `/register` now offers Campus Ambassador and Batch Ambassador side by side,
  reusing one validated form with programme-specific drafts and submission state.
- Ambassador submissions persist a constrained `type` value (`campus` or
  `batch`); existing rows default to `campus`. Run
  `drizzle/add_ambassador_type.sql` in the Supabase SQL Editor before deploying.
- The admin ambassador table now identifies and searches both registration types.
- Form payloads are validated by the same Zod schema on the client and server;
  the submit action no longer falls back to a publishable key or logs key details.

## 2026-08-28 — Tailwind scan scope and Tesseract loop recovery

- Restored Tailwind's `source("../")` import scope so only `src/` is scanned.
  The split `@source "../"` form allowed class-like wildcard examples in the
  root vault and `.claude/` files to produce invalid generated CSS such as
  `animation-duration: var(--duration-*)`.
- Removed the Tesseract canvas's duplicate initial `requestAnimationFrame`
  chain and clear the active frame handle at callback entry. Visibility and
  intersection pauses can now cancel the one authoritative loop and reliably
  wake it again.
- The scene now listens for live `prefers-reduced-motion` changes: enabling the
  preference freezes on a rendered frame, and disabling it safely resumes.

---

## 2026-08-28 — Hero FOUC fix: animated hero starts hidden in CSS, not JS

- On refresh, the server HTML painted all six scroll slides stacked on
  top of each other over the hero copy for the ~1s before React
  hydration — their hidden state existed only in GSAP
  (`useLayoutEffect`), which cannot run until the bundle loads.
- Fix: an inline gate script (first child of `<body>` in
  `src/app/layout.tsx`) adds `html.motion-ok` before first paint when
  `prefers-reduced-motion` is not set; new gate rules in `globals.css`
  start `[data-hero-rise]`/`[data-hero-fade]` at `opacity: 0` and
  position + hide `[data-slide]` under that class only.
- Hero slides now render **static-first** (bare divs in a `grid`); the
  absolute slide-deck layout moved from Tailwind classes into the CSS
  gate — no-JS and reduce-motion visitors get the readable static page
  immediately (before, they saw stacked slides until hydration).
- Intro tweens switched `.from()` → `.fromTo()` with explicit end
  values (a `from` would read the CSS-hidden 0 as the end state); the
  animation effect checks the media query directly since
  `useReducedMotion` syncs post-paint.
- `<html>` needs `suppressHydrationWarning` (missed initially): the
  pre-paint script mutates its `class` before React hydrates, and the
  mismatch could trip a client re-render that strips `motion-ok` and
  knocks the slides out of the pinned dive mid-animation. The hero
  effect also re-asserts the class before GSAP initializes as
  insurance against any framework attribute reconciliation.

---

## 2026-08-28 — Hero intro softened: gentle fade-rise replaces scramble decode

- Replaced the `ScrambleTextPlugin` cipher-decode intro in
  `src/components/home/msc-hero.tsx` with a subtle staggered fade + rise
  (`power2.out`, ~0.8s per element) — the decrypt effect read as visual
  noise on the landing hero.
- Data markers `data-scramble-status/-top/-bottom` renamed to a single
  `data-hero-rise` (DOM order drives the cascade). Scroll-driven tesseract
  dive and the `data-hero-fade` reveal are unchanged; `prefers-reduced-motion`
  still renders everything static. Plugin registration now loads only
  `ScrollTrigger`.

---



## 2026-08-20 — SEO metadata routes: sitemap.xml + robots.txt

- Added `src/app/sitemap.ts` (dynamic — static site routes + published CMS
  posts from the DB) and `src/app/robots.ts` (allows public pages, disallows
  `/admin`, `/cms`, `/profile`, auth pages, `/api/`, Sentry example routes).
- Both are whitelisted in `src/routes.ts` `publicRoutes` — the auth proxy in
  `src/proxy.ts` otherwise redirects unauthenticated requests to `/signin`.
- `metadataBase`, sitemap and robots all read `NEXT_PUBLIC_BASE_URL`
  (fallback `https://manaratscience.club`). Must be set to the production
  URL in the host env.
- Added `public/og.png` (1792×1024) as the OpenGraph/Twitter card image —
  the previous `/msc.svg` was not renderable by social crawlers.
- Deleted Sentry demo routes (`/sentry-example-page`, `/api/sentry-example-api`)
  and stray public assets (Minecraft mod jar, `Tr2n.ttf`, duplicate member
  images).

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-08-20 — Single global navbar + data fix

- Fixed syntax error in `src/lib/data/index.ts` (unescaped quotes around
  "Science Talk" in the new advisor-2 quote).
- Navbar is now **one global bar everywhere** (home, inner pages, auth, 404):
  `MscNav` lost its overlay/bar variants; links are Home `/`, Members
  `/legacy`, Research `/blogs`, and Register `/register` (ion CTA).
  `src/components/nav.tsx` no longer branches on pathname.

## 2026-08-20 — Mission Queue replaced by Editorial advisor section

- Removed home `Telemetry` (radar + MISSION QUEUE) — `telemetry.tsx` deleted.
- Added `src/components/home/editorial-voices.tsx` (`#editorial`): "Editorial —
  Words of wisdom from our faculty advisors". Copy and quotes pulled from the
  `leadership` data (matches old-site `drawsvg-redesign.html` leadership section);
  advisors have no photos, so cards use monogram avatar frames like the old site.
- Home nav "Mission → #mission" became "Editorial → #editorial".

## 2026-08-20 — Fleet section replaced by competition carousel

- Removed the home "Fleet" divisions pan (`divisions-pan.tsx` + `src/lib/data/home-cards.ts` deleted).
- Added `src/components/home/competition-carousel.tsx` (`#showcase`): auto-scrolling
  photo strip (GSAP `xPercent` loop, 45s, pauses on hover/focus, static under
  reduced motion). No viewer/controls — just images moving in a line, edge-faded.
- Frames come from `competitionShowcase` in `src/lib/data/index.ts` — placeholder
  shots from `public/memberimage/` until real competition photos arrive.
- Home nav link "Fleet → #divisions" became "Showcase → #showcase".

## 2026-08-20 — GooeyNav navbar experiment — reverted

Briefly integrated React Bits GooeyNav into `msc-nav.tsx`; reverted same day
at request — the previous underline-link navbar was preferred. No residue left
(component files, `--sh-ion` token and nav rewrite all removed).

## 2026-08-20 — ChromaGrid member cards + full "//" sweep

- Integrated React Bits **ChromaGrid** as `src/components/ui/chroma-grid.tsx`
  (+ `chroma-grid.css`): TypeScript-typed, GSAP spotlight with
  `useReducedMotion` gating (durations drop to 0), `next/image` instead of raw
  `<img>`, token-based CSS (`--space-*`, `--radius-2xl`), social icon links
  with stopPropagation on the anchors, and a fallback placeholder for members
  without photos.
- `/legacy` redesigned around it: member sections map `Member[]` → `ChromaItem`
  with rotating token accents (ion / space-amber / space-sage / teal-bright);
  name, role, batch, and socials all preserved.
- Finished the `//` sweep missed earlier: kicker strings in achievements,
  events, join, opportunities, profile, signin, signup, forgot/reset-password,
  and legacy hero. Only URLs contain `//` now.

Verified: `verify.sh` 0 FAIL (6 pre-existing WARNs), `pnpm lint` clean,
`pnpm build` green, `/legacy` smoke-tested on the dev server.

## 2026-08-20 — Robotics hub + "//" removal + README rewrite

- New `/robotics` page: division stats, focus-area chips, **Project Display**
  (filtered from `projects`), **Olympiads & Honors** (robotics achievements),
  upcoming robotics events, join CTA. Two new robotics projects added to the
  data module (`proj-005` greenhouse system, `proj-006` line-follower).
  Wired into `publicRoutes`, nav, and footer Explore column.
- Removed all displayed `//` separators: nav/footer wordmarks are now
  `MSC`, hero status line uses an em dash, legal kickers
  are `MSC Legal`, 404 sign-off uses `·`.
- `README.md` fully rewritten to document the actual architecture: route
  groups, three-layer authorization, data layer, design tokens, motion rules,
  file-by-file structure, routes table, env setup.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green,
`/robotics` smoke-tested on the dev server.

## 2026-08-20 — Navbar + footer redesign

- `msc-nav.tsx` — logo mark (Atom in ion square) + wordmark, scroll-aware
  blur/backdrop, animated ion underline on hover/active links, filled ion CTA,
  numbered mobile menu items. `siteNavigation` gains Opportunities. Mobile menu
  duration drops to 0 under `useReducedMotion`.
- `msc-footer.tsx` — expanded from one strip to a 4-column footer: brand +
  tagline + address/email/phone, Explore links, Get Involved (Join, Campus
  Ambassador, bug report) + Legal, Community (Instagram, Facebook, Discord,
  boys/girls WhatsApp), plus bottom bar with copyright, founded year, and
  developer credit. All info sourced from `siteConfig`.
- Smoke-tested against the running dev server: nav/footer render on `/legacy`,
  404 renders for invalid `/blogs/:slug`. Note: unknown top-level paths still
  307 to `/signin` (proxy gates non-public routes — pre-existing behaviour).

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

## 2026-08-20 — Custom 404 + legal pages

- `src/app/not-found.tsx` — themed "Lost in space" 404 with Nav +
  Footer, ion glow, and CTA links back to `/` and `/events`.
- `/privacy-policy` and `/terms` — built on a shared
  `src/components/site/legal-shell.tsx` (numbered sections, dark msc theme);
  both added to `publicRoutes` in `src/routes.ts` so the proxy lets them through.
- `msc-footer.tsx` gains a bottom row with copyright + Privacy/Terms links.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

## 2026-08-20 — Grand admin panel (`/admin`)

New admin-only route group `(admin)` reusing the CMS auth stack
(`getServerSession` + better-auth roles). The layout redirects non-admins to `/`.

- `/admin` — stats dashboard (total / this week / this month / unique schools)
  plus recent `campus_ambassador_registrations`.
- `/admin/campus-ambassador` — full response viewer (search + expandable
  experience rows); client table at
  `src/app/(routes)/(admin)/admin/campus-ambassador/registrations-table.tsx`.
- `/admin/science-competition` — placeholder until that form launches.
- `campus_ambassador_registrations` is now mirrored in the Drizzle schema
  (`src/db/schema/registrations.ts`); reads go through the admin-guarded
  `src/lib/actions/registrations.ts`, not the Supabase client.
- CMS sidebar gains an "Admin Panel" link for admins.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

## 2026-08-19 — Auth system audit: bug fixes & hardening

Audit pass over the better-auth layer. Schema decisions in ADR-0024.

| Area | Change |
|------|--------|
| Sign-out | `button-signout.tsx` called `redirect()` inside a client fetch callback (throws uncaught, never navigates) → `useRouter().push("/")` + `refresh()` |
| Proxy | `/api/*` and `/monitoring` (Sentry tunnel) no longer 307-redirected to `/signin` — `/api/upload` returns its own 401 and client-side Sentry reporting works for logged-out users |
| Routes | `/verify-email` added to `publicRoutes`; dead `/forgot-password` removed from `authRoutes` |
| Password policy | Sign-in reuses the shared `passwordSchema` (was min-6 vs signup's min-8+complexity, plus a "lenght" typo) |
| Role default | better-auth `role` additionalField default `"user"` → `"member"`, matching the DB default and the CMS admin/writer/member set |
| Role changes | CMS users table now calls the `updateUserRole` server action (gains the self-change guard) instead of `authClient.admin.setRole` |
| Error handling | Ambassador form no longer surfaces raw Supabase error messages to visitors |
| Rate limit | Explicit `rateLimit: { enabled: true }` (better-auth defaults cap sign-in/sign-up at 3 req/10s); in-memory store — add shared storage for multi-instance deploys |
| Secrets | `env.example` warns `BETTER_AUTH_SECRET` must be a real random value, never the placeholder |
| Schema | Dropped `enableRLS()` on the four auth tables, added `session.impersonatedBy`, made `user.gender` nullable (ADR-0024) |
| Hygiene | `console.log` → `console.info` in `resend.ts` dev verification-link fallback |

Verified: `verify.sh`/`pnpm lint` clean, `pnpm build` green.

## 2026-08-19 — Adopted the vault + `.claude/` enforcement system from `next16-claude-starter`

This is an **existing** Next.js 16 site (Manarat Science Club) that adopted the
starter's documentation vault and agent harness — not a fresh project built on
the starter. The stack differs materially; `AGENTS.md` carries the adapted hard
rules and ADR-0023 records the deviations.

| Area | Change |
|------|--------|
| Vault | `obsidian/` copied in as the single source of truth |
| Harness | `.claude/` (commands, rules, skills, agents, hooks, `verify.sh`) copied in and adapted: `yarn` → `pnpm`, spring-engine checks replaced by GSAP/motion/three checks |
| `AGENTS.md` | Rewritten for this project's hard rules (GSAP + motion + three.js motion stack, Drizzle + better-auth backend) |
| Code | First rules pass: removed all `any` (typed auth payloads via `Parameters<...>` casts, `UserRole` guard), tokenized footer gradients (`--manara-teal-deep`, `--manara-teal-bright`), `next/image` for teaser grid (+ `images.unsplash.com` remotePattern), `aria-label` on nav landmarks, GA id via `NEXT_PUBLIC_GA_MEASUREMENT_ID` with fallback, unused imports/props removed |
| Verification | `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green |

Known, justified WARNs: hex literals in `src/lib/tag-styles.ts` / `dot-grid.tsx`
defaults / `blogs-content.tsx` (config values, not stylesheets); raw `<img>` in
`profile-form.tsx` (blob: preview URLs); `console.log` in `resend.ts` (dev
verification-link fallback); two TODOs in auth forms.

**Build fix:** Tailwind v4 auto-scanned the vault and `.claude/` and generated
utilities from doc prose — including the wildcard example
`duration-[var(--duration-*)]`, which is invalid CSS and broke the build.
`globals.css` now scopes the scan with `@import "tailwindcss" source("../")`
(`src/` only). Keep class-like examples in docs harmless, or leave this
scoping in place if more vault folders land at the root.
