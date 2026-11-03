-- Vigilante step 1: structured, private data the Vigilante can match alerts against.
-- Every field is optional and owner-only. Nothing here is public or shown on the QR page.

-- Household postal code: one per account, asked once even with several pets.
-- Kept out of public.profiles, which is publicly readable.
create table public.household_private_details(
 user_id uuid primary key references auth.users(id) on delete cascade,
 postal_code text,
 updated_at timestamptz not null default now(),
 constraint household_postal_code_valid check(postal_code is null or postal_code ~ '^[0-9]{5}$')
);
alter table public.household_private_details enable row level security;

create policy household_private_details_owner_select on public.household_private_details
 for select to authenticated using(user_id = (select auth.uid()));
create policy household_private_details_owner_insert on public.household_private_details
 for insert to authenticated with check(user_id = (select auth.uid()));
create policy household_private_details_owner_update on public.household_private_details
 for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy pazo_maintenance_access on public.household_private_details
 as restrictive for all to anon,authenticated
 using((select public.pazo_maintenance_data_allowed())) with check((select public.pazo_maintenance_data_allowed()));

revoke all on public.household_private_details from anon;
grant select, insert, update on public.household_private_details to authenticated;

-- Pet health and food, on the existing owner-only private row.
alter table public.pet_private_details
 add column birth_month date,
 add column health_conditions text[] not null default '{}',
 add column food_brand text,
 add column food_product text;

alter table public.pet_private_details
 add constraint pet_birth_month_valid check(
  birth_month is null or (extract(day from birth_month) = 1 and birth_month >= date '1990-01-01')
 ),
 add constraint pet_health_conditions_valid check(
  health_conditions <@ array['allergies','diabetes','heart','respiratory','seizures','other']::text[]
 ),
 add constraint pet_food_brand_length check(food_brand is null or char_length(btrim(food_brand)) between 1 and 80),
 add constraint pet_food_product_length check(food_product is null or char_length(btrim(food_product)) between 1 and 120);
