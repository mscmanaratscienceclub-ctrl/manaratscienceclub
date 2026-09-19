-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest registrations — gender, registration ID + team names
--
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor) **before** the
-- code that reads it is deployed. `src/app/(routes)/(site)/stemfestreg/actions.ts`
-- selects `registration_code` on every submission, so an un-migrated database
-- makes the registration form fail outright (PostgREST resolves the select list
-- before the insert runs, so nothing is half-written — but nothing is written
-- either). Idempotent — safe to re-run.
--
-- ## The registration ID
--
-- Format: `<GENDER><CLASS><NNN>` — one letter for gender, the class code, then a
-- zero-padded counter that restarts per (gender, class). So the first Class-7 boy
-- to register is `M7001`, the next is `M7002`, and the first A-Level girl is
-- `FAS001`.
--
--   gender  male → M · female → F · other → O · not recorded → X
--   class   class-3 … class-10 → 3 … 10 · as → AS · a2 → A2 · university → U
--
-- ## Why a trigger and not application code
--
-- Two reasons, and both are correctness rather than taste:
--
--   1. **Atomicity.** The counter is bumped with `insert … on conflict do update
--      … returning`, which takes a row lock. Two participants submitting in the
--      same second serialise on that row instead of both reading the same "last
--      number" and minting the same ID. A `select max(...) + 1` in the Server
--      Action would produce duplicates under exactly the load a registration day
--      creates, and duplicates are only discovered when two people hold the same
--      ID on the results sheet.
--   2. **Every insert path.** The public form writes through the Supabase
--      service-role client, an admin can correct a row from the SQL editor, and
--      the payment-SMS forwarder writes rows of its own. A trigger covers all of
--      them; application code covers only the one it was written into.
--
-- `registration_code` is never rewritten: the trigger leaves a row alone when the
-- column already holds a value, so an ID cannot change under a participant who
-- has already been told what it is.
--
-- ## Team names
--
-- A team's name is stored inside `entries` (one per team event, since a
-- participant may enter two team segments with different teams), so there is no
-- column for it here — only the note that `entries` now carries a `teamName` key.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── New columns ──────────────────────────────────────────────────────────────

alter table public.stem_fest_registrations
  -- Nullable in the schema even though the form requires it: every row collected
  -- before the form asked for a gender has none, and inventing one would be a lie
  -- in a column the club may later report on. `stemfest_gender_letter` below
  -- renders that absence as `X` rather than pretending it is `O`.
  add column if not exists gender            text,
  add column if not exists registration_code text;

alter table public.stem_fest_registrations
  drop constraint if exists stem_fest_registrations_gender_check;
alter table public.stem_fest_registrations
  add constraint stem_fest_registrations_gender_check
  check (gender is null or gender in ('male', 'female', 'other'));

comment on column public.stem_fest_registrations.gender is
  'Participant gender. NULL for rows collected before the form asked; the ID then reads X for that position.';
comment on column public.stem_fest_registrations.registration_code is
  'Registration ID, <GENDER><CLASS><NNN>, minted by trigger on insert. Never rewritten.';

-- ── Counter table ────────────────────────────────────────────────────────────
-- One row per printed prefix (`M7`, `FAS`, `OU`, …). Small enough to stay in
-- cache, and the row lock is what makes concurrent registrations safe.

create table if not exists public.stem_fest_registration_counters (
  prefix      text primary key,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now()
);

comment on table public.stem_fest_registration_counters is
  'Last registration number issued per <GENDER><CLASS> prefix. Read and bumped by stemfest_next_registration_code().';

-- No anon/authenticated access: the counter is only ever touched by the trigger,
-- which runs as the table owner (SECURITY DEFINER), so the table needs no policy
-- at all. RLS is still enabled so a leaked publishable key cannot read how many
-- participants are in each class.
alter table public.stem_fest_registration_counters enable row level security;


-- ── ID construction ──────────────────────────────────────────────────────────

/**
 * The letter that leads a registration ID.
 *
 * `X` is the honest answer for a row with no gender on file — it is a distinct
 * value from `O` ("Other"), so a club report can never mistake "we did not ask
 * this participant" for "this participant chose Other".
 */
create or replace function public.stemfest_gender_letter(p_gender text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_gender, '')))
    when 'male'   then 'M'
    when 'female' then 'F'
    when 'other'  then 'O'
    else 'X'
  end;
$$;

/** The class code in the middle of a registration ID: `class-7` → `7`, `as` → `AS`. */
create or replace function public.stemfest_class_code(p_class text)
returns text
language sql
immutable
as $$
  select case
    when p_class like 'class-%' then substr(p_class, 7)
    when lower(p_class) = 'as' then 'AS'
    when lower(p_class) = 'a2' then 'A2'
    when lower(p_class) = 'university' then 'U'
    -- An unrecognised class still yields a usable code rather than an empty
    -- string, so a class added to the catalogue can never mint a bare number with
    -- no class in it. Keep this branch.
    else upper(coalesce(nullif(btrim(p_class), ''), 'X'))
  end;
$$;

/**
 * Mints the next ID for one (gender, class) pair.
 *
 * The whole concurrency story is the `on conflict do update`: Postgres locks the
 * counter row, so the second caller blocks until the first has committed and
 * reads the *incremented* value. `returning` hands back the post-update number,
 * which is why this is a single statement and not a read-then-write.
 *
 * SECURITY DEFINER so the function can bump the counter whichever role is
 * inserting (the public form's service role, an admin, a migration). `search_path`
 * is pinned because a definer function that resolves names through the caller's
 * path is a privilege-escalation hole.
 */
create or replace function public.stemfest_next_registration_code(
  p_gender text,
  p_class  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text := public.stemfest_gender_letter(p_gender)
                   || public.stemfest_class_code(p_class);
  v_number integer;
begin
  insert into public.stem_fest_registration_counters (prefix, last_number)
  values (v_prefix, 1)
  on conflict (prefix) do update
    set last_number = public.stem_fest_registration_counters.last_number + 1,
        updated_at  = now()
  returning last_number into v_number;

  -- Three digits is the documented minimum, not a ceiling: the 1000th Class-7
  -- boy is `M71000`, which still sorts correctly because the prefix is
  -- fixed-width.
  return v_prefix || lpad(v_number::text, 3, '0');
end;
$$;

/** `before insert` hook that stamps the ID. */
create or replace function public.stemfest_assign_registration_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- An ID that already has a value is never renumbered — that is what keeps an
  -- ID stable for a participant who has already been told what it is.
  if new.registration_code is not null and btrim(new.registration_code) <> '' then
    return new;
  end if;

  new.registration_code := public.stemfest_next_registration_code(
    new.gender,
    new.class
  );
  return new;
end;
$$;

drop trigger if exists stemfest_assign_registration_code
  on public.stem_fest_registrations;
create trigger stemfest_assign_registration_code
  before insert on public.stem_fest_registrations
  for each row
  execute function public.stemfest_assign_registration_code();

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Rows already filed have no ID. They are numbered oldest-first so the sequence
-- reads the way the registrations arrived, and the loop goes through the same
-- function the trigger calls — so a backfilled ID and a minted one are the same
-- shape by construction, not by two implementations agreeing by hand.
--
-- Idempotent: only `null` codes are filled, so re-running this file renumbers
-- nothing.

do $$
declare
  r record;
begin
  for r in
    select id, gender, class
    from public.stem_fest_registrations
    where registration_code is null
    order by created_at, id
  loop
    update public.stem_fest_registrations
      set registration_code = public.stemfest_next_registration_code(r.gender, r.class)
      where id = r.id;
  end loop;
end $$;

-- ── The guarantee ────────────────────────────────────────────────────────────
-- NOT NULL + UNIQUE is what makes "every response has its own ID" a property of
-- the database rather than a hope about the application. If the trigger is ever
-- dropped, the next insert fails loudly instead of storing a row with no ID.

alter table public.stem_fest_registrations
  alter column registration_code set not null;

create unique index if not exists stem_fest_registrations_code_key
  on public.stem_fest_registrations (registration_code);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Belt and braces alongside SECURITY DEFINER: the function runs as its owner, but
-- an explicit grant means a future change of owner cannot turn a registration into
-- a permission error.

grant select, insert, update on public.stem_fest_registration_counters
  to service_role;
