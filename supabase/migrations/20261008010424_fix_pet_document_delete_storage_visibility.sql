drop policy if exists pet_documents_storage_select on storage.objects;

create policy pet_documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.pet_documents d
    join public.pets pet on pet.id = d.pet_id
    where d.storage_path = storage.objects.name
      and d.status in ('active', 'deleting')
      and pet.owner_id = (select auth.uid())
  )
);
