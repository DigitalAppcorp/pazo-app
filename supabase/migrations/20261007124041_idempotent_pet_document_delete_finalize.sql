create or replace function document_private.try_finalize_delete_pet_document_internal(
  p_document_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select d.storage_path, d.status
  into v_storage_path, v_status
  from public.pet_documents d
  join public.pets p on p.id = d.pet_id
  where d.id = p_document_id
    and p.owner_id = v_user_id
  for update of d;

  if not found then
    return true;
  end if;

  if v_status <> 'deleting' then
    return false;
  end if;

  if exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'pet-documents'
      and o.name = v_storage_path
  ) then
    return false;
  end if;

  delete from public.pet_documents
  where id = p_document_id;

  return true;
end;
$$;

revoke all on function document_private.try_finalize_delete_pet_document_internal(uuid) from public;
revoke all on function document_private.try_finalize_delete_pet_document_internal(uuid) from anon;
grant execute on function document_private.try_finalize_delete_pet_document_internal(uuid) to authenticated;
grant usage on schema document_private to authenticated;

create or replace function public.try_finalize_delete_pet_document(
  p_document_id uuid
)
returns boolean
language sql
set search_path = ''
as $$
  select document_private.try_finalize_delete_pet_document_internal(p_document_id);
$$;

revoke all on function public.try_finalize_delete_pet_document(uuid) from public;
revoke all on function public.try_finalize_delete_pet_document(uuid) from anon;
grant execute on function public.try_finalize_delete_pet_document(uuid) to authenticated;
