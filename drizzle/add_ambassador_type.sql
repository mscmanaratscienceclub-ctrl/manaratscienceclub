-- Add a discriminator for Campus and Batch Ambassador applications.
-- Existing registrations are Campus Ambassador applications.

alter table public.campus_ambassador_registrations
  add column if not exists type text not null default 'campus';

update public.campus_ambassador_registrations
set type = 'campus'
where type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campus_ambassador_registrations_type_check'
      and conrelid = 'public.campus_ambassador_registrations'::regclass
  ) then
    alter table public.campus_ambassador_registrations
      add constraint campus_ambassador_registrations_type_check
      check (type in ('campus', 'batch'));
  end if;
end
$$;
