BEGIN;

DROP POLICY IF EXISTS pet_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_delete ON storage.objects;

CREATE POLICY pet_documents_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  storage.objects.bucket_id = 'pet-documents'
  AND array_length(storage.foldername(storage.objects.name), 1) = 2
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = storage.objects.name
      AND d.status = 'uploading'
      AND d.pet_id::text = (storage.foldername(storage.objects.name))[2]
      AND pet.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  storage.objects.bucket_id = 'pet-documents'
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = storage.objects.name
      AND d.status = 'active'
      AND pet.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  storage.objects.bucket_id = 'pet-documents'
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = storage.objects.name
      AND d.status IN ('uploading', 'deleting')
      AND pet.owner_id = (SELECT auth.uid())
  )
);

COMMIT;
