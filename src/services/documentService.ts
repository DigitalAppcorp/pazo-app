import { supabase } from './supabaseClient'
import type {
  DocumentCategory,
  PetDocument,
} from '../types/pazo'

export const DOCUMENTS_PAGE_SIZE = 20
export const DOCUMENT_BUCKET = 'pet-documents'
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

interface PetDocumentRow {
  id: string
  pet_id: string
  title: string
  category: DocumentCategory
  original_file_name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  status: 'uploading' | 'active' | 'deleting'
  created_at: string
  updated_at: string
}

interface DocumentPage {
  items: PetDocument[]
  total: number
}

const mapDocument = (row: PetDocumentRow): PetDocument => ({
  id: row.id,
  petId: row.pet_id,
  title: row.title,
  category: row.category,
  originalFileName: row.original_file_name,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const cleanTitle = (title: string | undefined, fallback: string) => {
  const value = title?.trim() || fallback.trim()
  return value.slice(0, 160)
}

export const validateDocumentFile = (file: File) => {
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error('UNSUPPORTED_DOCUMENT_TYPE')
  }

  if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('DOCUMENT_TOO_LARGE')
  }
}

const rpcVoid = async (name: string, args: Record<string, unknown>) => {
  const { error } = await supabase.rpc(name, args)
  if (error) throw error
}

export const fetchPetDocumentsPage = async (
  petId: string,
  offset = 0,
  limit = DOCUMENTS_PAGE_SIZE
): Promise<DocumentPage> => {
  const safeLimit = Math.max(1, Math.min(limit, 50))
  const { data, error, count } = await supabase
    .from('pet_documents')
    .select('*', { count: 'exact' })
    .eq('pet_id', petId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + safeLimit - 1)

  if (error) throw error

  return {
    items: ((data || []) as PetDocumentRow[]).map(mapDocument),
    total: count || 0,
  }
}

const fetchPendingPetDocuments = async (petId: string): Promise<PetDocument[]> => {
  const { data, error } = await supabase
    .from('pet_documents')
    .select('*')
    .eq('pet_id', petId)
    .in('status', ['uploading', 'deleting'])
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) throw error
  return ((data || []) as PetDocumentRow[]).map(mapDocument)
}

const beginUpload = async (
  petId: string,
  file: File,
  title: string | undefined,
  category: DocumentCategory
) => {
  const { data, error } = await supabase.rpc('begin_pet_document_upload', {
    p_pet_id: petId,
    p_title: cleanTitle(title, file.name),
    p_category: category,
    p_original_file_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id || !row?.storage_path) {
    throw new Error('Document reservation did not return an id/path.')
  }

  return {
    id: row.id as string,
    storagePath: row.storage_path as string,
  }
}

const cancelUpload = async (documentId: string) => {
  await rpcVoid('cancel_pet_document_upload', {
    p_document_id: documentId,
  })
}

const finalizeUpload = async (documentId: string) => {
  await rpcVoid('finalize_pet_document_upload', {
    p_document_id: documentId,
  })
}

export const uploadPetDocument = async (
  petId: string,
  file: File,
  title: string | undefined,
  category: DocumentCategory
) => {
  validateDocumentFile(file)

  const reservation = await beginUpload(petId, file, title, category)

  try {
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(reservation.storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    await finalizeUpload(reservation.id)
  } catch (error) {
    try {
      await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([reservation.storagePath])
    } catch (cleanupError) {
      console.error('Could not clean up failed document upload:', cleanupError)
    }

    try {
      await cancelUpload(reservation.id)
    } catch (cleanupError) {
      console.error('Could not cancel failed document reservation:', cleanupError)
    }

    throw error
  }
}

export const updatePetDocumentMetadata = async (
  documentId: string,
  title: string,
  category: DocumentCategory
) => {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) throw new Error('DOCUMENT_TITLE_REQUIRED')

  const { error } = await supabase
    .from('pet_documents')
    .update({
      title: normalizedTitle.slice(0, 160),
      category,
    })
    .eq('id', documentId)
    .eq('status', 'active')

  if (error) throw error
}

export const downloadPetDocumentBlob = async (
  document: Pick<PetDocument, 'storagePath'>
) => {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .download(document.storagePath)

  if (error) throw error
  return data
}

const beginDelete = async (documentId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('begin_delete_pet_document', {
    p_document_id: documentId,
  })

  if (error) throw error
  if (typeof data !== 'string' || !data) {
    throw new Error('Document deletion did not return a storage path.')
  }

  return data
}

const finalizeDelete = async (documentId: string) => {
  await rpcVoid('finalize_delete_pet_document', {
    p_document_id: documentId,
  })
}

const cancelDelete = async (documentId: string) => {
  await rpcVoid('cancel_delete_pet_document', {
    p_document_id: documentId,
  })
}

export const deletePetDocument = async (document: PetDocument) => {
  const storagePath = await beginDelete(document.id)

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([storagePath])

  if (!storageError) {
    await finalizeDelete(document.id)
    return
  }

  try {
    await cancelDelete(document.id)
  } catch (cancelError) {
    try {
      await finalizeDelete(document.id)
      return
    } catch {
      console.error('Could not reconcile failed document deletion:', cancelError)
    }
  }

  throw storageError
}

export const recoverPetDocumentOperations = async (petId: string) => {
  const pending = await fetchPendingPetDocuments(petId)

  for (const document of pending) {
    if (document.status === 'deleting') {
      const { error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([document.storagePath])

      if (!error) {
        try {
          await finalizeDelete(document.id)
        } catch (finalizeError) {
          console.error('Could not finalize pending document deletion:', finalizeError)
        }
      }

      continue
    }

    try {
      await finalizeUpload(document.id)
    } catch (error: any) {
      const message = String(error?.message || '')

      if (
        message.includes('Document file is missing')
        || message.includes('Uploaded file metadata does not match reservation')
      ) {
        try {
          await supabase.storage
            .from(DOCUMENT_BUCKET)
            .remove([document.storagePath])
          await cancelUpload(document.id)
        } catch (cleanupError) {
          console.error('Could not clean pending document upload:', cleanupError)
        }
      }
    }
  }
}
