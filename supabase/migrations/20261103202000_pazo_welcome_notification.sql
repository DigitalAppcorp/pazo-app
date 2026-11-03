-- Vigilante step 1: one in-app welcome notice per account, pointing at its first pet,
-- inviting the owner to complete the pet's private details. In-app only, never a push.
-- The app shows localized fixed copy; title and body here are only a stored fallback.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower','welcome']));

create or replace function private.pazo_welcome_on_first_pet() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if not exists(select 1 from public.notifications n where n.user_id=new.owner_id and n.type='welcome') then
  insert into public.notifications(user_id,pet_id,type,title,body)
  values(new.owner_id,new.id,'welcome','Te damos la bienvenida a PAZO',
   'En PAZO trabajamos todos los días por ti y por tu mascota. Cuéntanos más de tu mascota para darte la mejor atención.');
 end if;
 return new;
exception when others then
 -- A welcome notice must never block creating a pet.
 raise warning 'pazo welcome notice skipped: %',sqlstate;
 return new;
end
$fn$;
revoke all on function private.pazo_welcome_on_first_pet() from public;

create trigger pazo_welcome_on_first_pet after insert on public.pets
 for each row execute function private.pazo_welcome_on_first_pet();

-- Existing accounts never see the new onboarding, so they get the notice once, on their oldest pet.
insert into public.notifications(user_id,pet_id,type,title,body)
select distinct on (p.owner_id) p.owner_id,p.id,'welcome','Te damos la bienvenida a PAZO',
 'En PAZO trabajamos todos los días por ti y por tu mascota. Cuéntanos más de tu mascota para darte la mejor atención.'
from public.pets p
where not exists(select 1 from public.notifications n where n.user_id=p.owner_id and n.type='welcome')
order by p.owner_id,p.created_at,p.id;
