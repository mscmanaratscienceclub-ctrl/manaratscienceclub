-- ─────────────────────────────────────────────────────────────────────────────
-- Ambassador contact & social fields
-- Adds phone, email, gender, facebook and instagram to the Campus/Batch
-- Ambassador registrations table.
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- Columns are nullable so applications submitted before this change stay valid.
-- The form itself requires phone, email and gender for every new submission.
alter table public.campus_ambassador_registrations
  add column if not exists phone     text,
  add column if not exists email     text,
  add column if not exists gender    text,
  add column if not exists facebook  text,
  add column if not exists instagram text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campus_ambassador_registrations_gender_check'
      and conrelid = 'public.campus_ambassador_registrations'::regclass
  ) then
    alter table public.campus_ambassador_registrations
      add constraint campus_ambassador_registrations_gender_check
      check (gender is null or gender in ('male', 'female', 'other'));
  end if;
end
$$;
