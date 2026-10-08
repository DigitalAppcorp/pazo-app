insert into validation_private.modules (module_key)
values ('places_map')
on conflict (module_key) do nothing;
