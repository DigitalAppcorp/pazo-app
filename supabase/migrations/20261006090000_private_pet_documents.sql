BEGIN;

-- -----------------------------------------------------------------------------
-- Phase 9B — Private pet documents
-- -----------------------------------------------------------------------------

CREATE TABLE public.pet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
  title text NOT NULL,
  category text NOT NULL,
  original_file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  status text NOT NULL DEFAULT 'uploading',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_documents_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  CONSTRAINT pet_documents_original_file_name_length
    CHECK (char_length(btrim(original_file_name)) BETWEEN 1 AND 255),
  CONSTRAINT pet_documents_category_check
    CHECK (category IN (
      'vaccines',
      'medical_history',
      'identification',
      'results',
      'other'
    )),
  CONSTRAINT pet_documents_mime_type_check
    CHECK (mime_type IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    )),
  CONSTRAINT pet_documents_size_bytes_check
    CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  CONSTRAINT pet_documents_status_check
    CHECK (status IN ('uploading', 'active', 'deleting')),
  CONSTRAINT pet_documents_storage_path_check
    CHECK (char_length(btrim(storage_path)) > 0)
);

CREATE INDEX idx_pet_documents_pet_status_created
  ON public.pet_documents (pet_id, status, created_at DESC, id DESC);

ALTER TABLE public.pet_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.prepare_pet_document()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.original_file_name := btrim(NEW.original_file_name);
  NEW.storage_path := btrim(NEW.storage_path);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.prepare_pet_document() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.prepare_pet_document() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_prepare_pet_document
BEFORE INSERT OR UPDATE ON public.pet_documents
FOR EACH ROW
EXECUTE FUNCTION private.prepare_pet_document();

CREATE POLICY pet_documents_owner_select
ON public.pet_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_owner_update
ON public.pet_documents
FOR UPDATE
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON TABLE public.pet_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pet_documents TO authenticated;
GRANT UPDATE (title, category) ON TABLE public.pet_documents TO authenticated;
GRANT ALL ON TABLE public.pet_documents TO service_role;

-- -----------------------------------------------------------------------------
-- Private Storage bucket
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'pet-documents',
  'pet-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS pet_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_delete ON storage.objects;

CREATE POLICY pet_documents_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-documents'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets p ON p.id = d.pet_id
    WHERE d.storage_path = name
      AND d.status = 'uploading'
      AND d.pet_id::text = (storage.foldername(name))[2]
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pet-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets p ON p.id = d.pet_id
    WHERE d.storage_path = name
      AND d.status = 'active'
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets p ON p.id = d.pet_id
    WHERE d.storage_path = name
      AND d.status IN ('uploading', 'deleting')
      AND p.owner_id = (SELECT auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- Upload lifecycle
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.begin_pet_document_upload(
  p_pet_id uuid,
  p_title text,
  p_category text,
  p_original_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
RETURNS TABLE (
  id uuid,
  storage_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_document_id uuid := gen_random_uuid();
  v_file_name text := btrim(COALESCE(p_original_file_name, ''));
  v_title text := NULLIF(btrim(COALESCE(p_title, '')), '');
  v_extension text;
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  IF p_category NOT IN (
    'vaccines',
    'medical_history',
    'identification',
    'results',
    'other'
  ) THEN
    RAISE EXCEPTION 'Unsupported document category.';
  END IF;

  IF p_mime_type NOT IN (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) THEN
    RAISE EXCEPTION 'Unsupported document MIME type.';
  END IF;

  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'Document size must be between 1 byte and 10 MB.';
  END IF;

  IF char_length(v_file_name) < 1 OR char_length(v_file_name) > 255 THEN
    RAISE EXCEPTION 'Original file name must contain between 1 and 255 characters.';
  END IF;

  IF v_title IS NULL THEN
    v_title := left(v_file_name, 160);
  END IF;

  IF char_length(v_title) < 1 OR char_length(v_title) > 160 THEN
    RAISE EXCEPTION 'Document title must contain between 1 and 160 characters.';
  END IF;

  v_extension := CASE p_mime_type
    WHEN 'application/pdf' THEN 'pdf'
    WHEN 'image/jpeg' THEN 'jpg'
    WHEN 'image/png' THEN 'png'
    WHEN 'image/webp' THEN 'webp'
    ELSE NULL
  END;

  IF v_extension IS NULL THEN
    RAISE EXCEPTION 'Unsupported document MIME type.';
  END IF;

  v_storage_path :=
    v_user_id::text || '/' ||
    p_pet_id::text || '/' ||
    v_document_id::text || '.' ||
    v_extension;

  INSERT INTO public.pet_documents (
    id,
    pet_id,
    title,
    category,
    original_file_name,
    storage_path,
    mime_type,
    size_bytes,
    status
  )
  VALUES (
    v_document_id,
    p_pet_id,
    v_title,
    p_category,
    v_file_name,
    v_storage_path,
    p_mime_type,
    p_size_bytes,
    'uploading'
  );

  RETURN QUERY
  SELECT v_document_id, v_storage_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_pet_document_upload(
  p_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
  v_expected_mime text;
  v_expected_size bigint;
  v_actual_mime text;
  v_actual_size bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT d.storage_path, d.mime_type, d.size_bytes
  INTO v_storage_path, v_expected_mime, v_expected_size
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'uploading'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document reservation not found or access denied.';
  END IF;

  SELECT
    o.metadata->>'mimetype',
    NULLIF(o.metadata->>'size', '')::bigint
  INTO v_actual_mime, v_actual_size
  FROM storage.objects o
  WHERE o.bucket_id = 'pet-documents'
    AND o.name = v_storage_path
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document file is missing.';
  END IF;

  IF v_actual_mime IS DISTINCT FROM v_expected_mime
     OR v_actual_size IS DISTINCT FROM v_expected_size THEN
    RAISE EXCEPTION 'Uploaded file metadata does not match reservation.';
  END IF;

  UPDATE public.pet_documents
  SET status = 'active'
  WHERE id = p_document_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_pet_document_upload(
  p_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT d.storage_path
  INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'uploading'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document reservation not found or access denied.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'pet-documents'
      AND o.name = v_storage_path
  ) THEN
    RAISE EXCEPTION 'Document file still exists.';
  END IF;

  DELETE FROM public.pet_documents
  WHERE id = p_document_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- Delete lifecycle
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.begin_delete_pet_document(
  p_document_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT d.storage_path
  INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'active'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found or access denied.';
  END IF;

  UPDATE public.pet_documents
  SET status = 'deleting'
  WHERE id = p_document_id;

  RETURN v_storage_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_delete_pet_document(
  p_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT d.storage_path
  INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'deleting'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending document deletion not found or access denied.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'pet-documents'
      AND o.name = v_storage_path
  ) THEN
    RAISE EXCEPTION 'Document file still exists.';
  END IF;

  DELETE FROM public.pet_documents
  WHERE id = p_document_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_delete_pet_document(
  p_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_storage_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT d.storage_path
  INTO v_storage_path
  FROM public.pet_documents d
  JOIN public.pets p ON p.id = d.pet_id
  WHERE d.id = p_document_id
    AND d.status = 'deleting'
    AND p.owner_id = v_user_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending document deletion not found or access denied.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'pet-documents'
      AND o.name = v_storage_path
  ) THEN
    RAISE EXCEPTION 'Document file is already missing.';
  END IF;

  UPDATE public.pet_documents
  SET status = 'active'
  WHERE id = p_document_id;
END;
$function$;

ALTER FUNCTION public.begin_pet_document_upload(uuid, text, text, text, text, bigint)
  OWNER TO postgres;
ALTER FUNCTION public.finalize_pet_document_upload(uuid)
  OWNER TO postgres;
ALTER FUNCTION public.cancel_pet_document_upload(uuid)
  OWNER TO postgres;
ALTER FUNCTION public.begin_delete_pet_document(uuid)
  OWNER TO postgres;
ALTER FUNCTION public.finalize_delete_pet_document(uuid)
  OWNER TO postgres;
ALTER FUNCTION public.cancel_delete_pet_document(uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.begin_pet_document_upload(uuid, text, text, text, text, bigint)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_pet_document_upload(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_pet_document_upload(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.begin_delete_pet_document(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_delete_pet_document(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_delete_pet_document(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.begin_pet_document_upload(uuid, text, text, text, text, bigint)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_pet_document_upload(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pet_document_upload(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_delete_pet_document(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_delete_pet_document(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_delete_pet_document(uuid)
  TO authenticated;

COMMIT;
