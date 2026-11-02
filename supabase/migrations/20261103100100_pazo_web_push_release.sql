-- Opens Web Push once the worker is deployed. To stop all sending and new
-- subscriptions at once, set enabled=false; the bell keeps working either way.
update push_private.release_gate set enabled=true,updated_at=now() where singleton;
