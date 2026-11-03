-- Vigilante step 1: a vaccine care item can name WHICH vaccine it is, from a closed list,
-- so outbreak alerts can tell "registered and current" from "not registered".
-- Additive and nullable: existing rows and older clients keep working unchanged.

alter table public.care_items add column vaccine_type text;

alter table public.care_items add constraint care_items_vaccine_type_valid check (
 vaccine_type is null
 or (category = 'vaccine' and vaccine_type = any(array[
  'rabies','dhpp','leptospirosis','bordetella','canine_influenza','fvrcp','felv','other'
 ]))
);

-- care_items uses column-level grants; the owner policies already scope the rows.
grant insert(vaccine_type), update(vaccine_type) on public.care_items to authenticated;
