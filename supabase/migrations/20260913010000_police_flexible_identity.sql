begin;

alter table public.people
  alter column ine_path drop not null;

alter table public.people
  drop constraint if exists police_requires_badge_number;

alter table public.people
  add constraint civil_requires_ine check (type <> 'civil' or ine_path is not null),
  add constraint police_requires_identity check (
    type <> 'police'
    or ine_path is not null
    or badge_number is not null
    or badge_path is not null
  );

commit;
