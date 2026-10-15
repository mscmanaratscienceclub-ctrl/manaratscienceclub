-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest registrations — who turned up, and when the mark last moved
--
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor) **before** the
-- code that reads it is deployed. `/admin/attendance` selects both columns on
-- every query, and so do its printed report, its spreadsheet export and the
-- browser cache that answers its searches — an un-migrated database fails the
-- whole section. Idempotent — safe to re-run.
--
-- ## Why one boolean on the registration
--
-- The desk question is "is this person here", which is one bit. The
-- alternative — a separate `stem_fest_attendance` table keyed by registration —
-- would be needed if attendance were recorded *per session* (a row for each of
-- the fest's two days, or per event). It is not: the club marks a roster once,
-- and a second day would be a second marking of the same list, which the panel
-- has no vocabulary for yet. Adding the table now would cost a join in every
-- attendance query and a second row identity in the report for a question nobody
-- has asked. See ADR-0045 in `obsidian/meta/decisions-log.md`.
--
-- ## No backfill, and what FALSE means
--
-- `not null default false` gives every existing row `false`, which the panel
-- reads as Absent. There is deliberately no third "never looked at" state: a
-- roll-call sheet with a checkbox has exactly two readings, and an admin who has
-- not reached a row yet has not marked it present. `attendance` is therefore a
-- fact about the desk, not about the participant — it says nothing about payment
-- or registration, which stay on their own columns.
--
-- ## Why `attendance_marked_at` exists
--
-- Not as an audit trail — as the **cache's change detector**. The sheet keeps a
-- copy of its list in the browser (ADR-0044) and asks once a minute whether the
-- table has moved. A count and the newest `created_at` detect a new registration
-- but not a tick, because a tick changes no timestamp the probe could read. So
-- every write to `attendance` moves `attendance_marked_at`, in **both**
-- directions, and `max(attendance_marked_at)` is what makes a mark made at the
-- other desk arrive here within a minute instead of never.
--
-- The way back to absent sets it for the same reason: the probe asks "did
-- anything change", not "did something become present". A pair of +1/−1 ticks
-- elsewhere leaves both the row count and the present count still, and only a
-- moving timestamp catches them.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.stem_fest_registrations
  add column if not exists attendance boolean not null default false,
  add column if not exists attendance_marked_at timestamptz;

comment on column public.stem_fest_registrations.attendance is
  'Marked present at the fest desk by an admin. Default false = not marked present.';
comment on column public.stem_fest_registrations.attendance_marked_at is
  'When the attendance switch last moved, either direction. The browser cache''s change cursor; null for a row nobody has touched.';
