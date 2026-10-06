import { useEffect, useRef, useState } from 'react'
import type {
  DocumentCategory,
  PetDocument,
} from '../../types/pazo'
import {
  IconClose,
  IconDocument,
  IconPlus,
} from '../icons/PazoIcons'

interface DocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  documents: PetDocument[]
  total: number
  isLoading: boolean
  error: string
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onRetry: () => void
  onUpload: (
    file: File,
    title: string,
    category: DocumentCategory
  ) => Promise<void>
  onUpdate: (
    documentId: string,
    title: string,
    category: DocumentCategory
  ) => Promise<void>
  onDelete: (document: PetDocument) => Promise<void>
  onGetBlob: (document: PetDocument) => Promise<Blob>
  lang: 'es' | 'en'
}

const CATEGORY_LABELS: Record<
  DocumentCategory,
  { es: string; en: string }
> = {
  vaccines: { es: 'Vacunas', en: 'Vaccines' },
  medical_history: { es: 'Historial veterinario', en: 'Medical history' },
  identification: { es: 'Identificación', en: 'Identification' },
  results: { es: 'Resultados / estudios', en: 'Results / studies' },
  other: { es: 'Otros', en: 'Other' },
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as DocumentCategory[]

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (value: string, lang: 'es' | 'en') =>
  new Date(value).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const safeDownloadName = (name: string) =>
  name.replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 180) || 'documento'

export const DocumentsModal = ({
  isOpen,
  onClose,
  petName,
  documents,
  total,
  isLoading,
  error,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRetry,
  onUpload,
  onUpdate,
  onDelete,
  onGetBlob,
  lang,
}: DocumentsModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>('other')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] =
    useState<DocumentCategory>('other')
  const [busyKey, setBusyKey] = useState('')
  const [localError, setLocalError] = useState('')
  const [preview, setPreview] = useState<{
    document: PetDocument
    url: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) return

    setSelectedFile(null)
    setUploadTitle('')
    setUploadCategory('other')
    setEditingId(null)
    setBusyKey('')
    setLocalError('')

    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview?.url])

  if (!isOpen) return null

  const startEdit = (document: PetDocument) => {
    setEditingId(document.id)
    setEditTitle(document.title)
    setEditCategory(document.category)
    setLocalError('')
  }

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFile || busyKey) return

    setBusyKey('upload')
    setLocalError('')

    try {
      await onUpload(
        selectedFile,
        uploadTitle.trim() || selectedFile.name,
        uploadCategory
      )
      setSelectedFile(null)
      setUploadTitle('')
      setUploadCategory('other')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (uploadError: any) {
      const message = String(uploadError?.message || '')

      if (message.includes('UNSUPPORTED_DOCUMENT_TYPE')) {
        setLocalError(
          lang === 'es'
            ? 'Ese tipo de archivo no está permitido. Usa PDF, JPG, PNG o WEBP.'
            : 'That file type is not allowed. Use PDF, JPG, PNG or WEBP.'
        )
      } else if (message.includes('DOCUMENT_TOO_LARGE')) {
        setLocalError(
          lang === 'es'
            ? 'El archivo debe pesar 10 MB o menos.'
            : 'The file must be 10 MB or smaller.'
        )
      } else {
        setLocalError(
          lang === 'es'
            ? 'No se pudo guardar el documento. Inténtalo de nuevo.'
            : 'Could not save the document. Please try again.'
        )
      }
    } finally {
      setBusyKey('')
    }
  }

  const submitEdit = async (
    event: React.FormEvent,
    documentId: string
  ) => {
    event.preventDefault()
    if (!editTitle.trim() || busyKey) return

    setBusyKey(`edit:${documentId}`)
    setLocalError('')

    try {
      await onUpdate(documentId, editTitle.trim(), editCategory)
      setEditingId(null)
    } catch {
      setLocalError(
        lang === 'es'
          ? 'No se pudieron guardar los cambios.'
          : 'Could not save the changes.'
      )
    } finally {
      setBusyKey('')
    }
  }

  const openPreview = async (document: PetDocument) => {
    if (busyKey) return

    setBusyKey(`preview:${document.id}`)
    setLocalError('')

    try {
      const blob = await onGetBlob(document)
      const url = URL.createObjectURL(blob)

      if (preview?.url) URL.revokeObjectURL(preview.url)
      setPreview({ document, url })
    } catch {
      setLocalError(
        lang === 'es'
          ? 'No se pudo abrir el documento.'
          : 'Could not open the document.'
      )
    } finally {
      setBusyKey('')
    }
  }

  const downloadDocument = async (document: PetDocument) => {
    if (busyKey) return

    setBusyKey(`download:${document.id}`)
    setLocalError('')

    try {
      const blob = await onGetBlob(document)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = safeDownloadName(document.originalFileName)
      window.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      setLocalError(
        lang === 'es'
          ? 'No se pudo descargar el documento.'
          : 'Could not download the document.'
      )
    } finally {
      setBusyKey('')
    }
  }

  const deleteDocument = async (document: PetDocument) => {
    if (busyKey) return

    const confirmed = window.confirm(
      lang === 'es'
        ? `¿Eliminar "${document.title}"? Esta acción quitará el archivo privado.`
        : `Delete "${document.title}"? This will remove the private file.`
    )

    if (!confirmed) return

    setBusyKey(`delete:${document.id}`)
    setLocalError('')

    try {
      await onDelete(document)
      if (preview?.document.id === document.id) {
        URL.revokeObjectURL(preview.url)
        setPreview(null)
      }
    } catch {
      setLocalError(
        lang === 'es'
          ? 'No se pudo eliminar el documento. Inténtalo de nuevo.'
          : 'Could not delete the document. Please try again.'
      )
    } finally {
      setBusyKey('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#204E4A]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl max-h-[94vh] bg-[#FAF8F5] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-4 bg-white border-b border-[#204E4A]/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-black text-[#5C7470]">
              {lang === 'es' ? 'Privado' : 'Private'}
            </p>
            <h2 className="text-xl font-black text-[#204E4A] mt-1">
              {lang === 'es' ? 'Documentos' : 'Documents'}
            </h2>
            <p className="text-xs text-[#5C7470] mt-1">
              {lang === 'es'
                ? `${total} documentos de ${petName}`
                : `${total} documents for ${petName}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#204E4A]/8 text-[#204E4A] flex items-center justify-center cursor-pointer"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <IconClose size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null
              setSelectedFile(file)
              setUploadTitle(file?.name || '')
              setUploadCategory('other')
              setLocalError('')
            }}
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(busyKey)}
              className="w-full bg-[#204E4A] text-[#E1E53F] rounded-2xl px-4 py-3 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <IconPlus size={16} />
              {lang === 'es' ? 'Añadir documento' : 'Add document'}
            </button>
          ) : (
            <form
              onSubmit={submitUpload}
              className="bg-white rounded-[1.5rem] p-4 border border-[#204E4A]/10 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E1E53F]/35 text-[#204E4A] flex items-center justify-center shrink-0">
                  <IconDocument size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#204E4A] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-[#5C7470]">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Título' : 'Title'}
                </label>
                <input
                  value={uploadTitle}
                  maxLength={160}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Categoría' : 'Category'}
                </label>
                <select
                  value={uploadCategory}
                  onChange={(event) =>
                    setUploadCategory(event.target.value as DocumentCategory)
                  }
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category][lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={Boolean(busyKey)}
                  className="py-2.5 rounded-full text-xs font-bold text-[#5C7470] bg-[#204E4A]/6 cursor-pointer"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={Boolean(busyKey)}
                  className="py-2.5 rounded-full text-xs font-black text-[#E1E53F] bg-[#204E4A] cursor-pointer disabled:opacity-50"
                >
                  {busyKey === 'upload'
                    ? (lang === 'es' ? 'Guardando…' : 'Saving…')
                    : (lang === 'es' ? 'Guardar' : 'Save')}
                </button>
              </div>
            </form>
          )}

          {(localError || error) && (
            <div className="rounded-2xl bg-[#FFF2EE] border border-[#EC7357]/25 px-4 py-3">
              <p className="text-xs font-bold text-[#EC7357]">
                {localError || error}
              </p>
              {error && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 text-xs font-black text-[#204E4A] cursor-pointer"
                >
                  {lang === 'es' ? 'Reintentar' : 'Retry'}
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-7 h-7 border-2 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="py-10 px-5 text-center bg-white rounded-[1.75rem] border border-[#204E4A]/8">
              <div className="w-12 h-12 rounded-2xl bg-[#204E4A]/8 text-[#204E4A] flex items-center justify-center mx-auto">
                <IconDocument size={23} />
              </div>
              <p className="text-sm font-black text-[#204E4A] mt-3">
                {lang === 'es' ? 'Aún no hay documentos' : 'No documents yet'}
              </p>
              <p className="text-xs text-[#5C7470] mt-1">
                {lang === 'es'
                  ? 'Guarda aquí archivos privados importantes de tu mascota.'
                  : 'Keep important private pet files here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="bg-white rounded-[1.5rem] p-4 border border-[#204E4A]/8 shadow-xs"
                >
                  {editingId === document.id ? (
                    <form
                      onSubmit={(event) => void submitEdit(event, document.id)}
                      className="space-y-3"
                    >
                      <input
                        value={editTitle}
                        maxLength={160}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
                      />
                      <select
                        value={editCategory}
                        onChange={(event) =>
                          setEditCategory(event.target.value as DocumentCategory)
                        }
                        className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {CATEGORY_LABELS[category][lang]}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="py-2 rounded-full text-xs font-bold bg-[#204E4A]/6 text-[#5C7470] cursor-pointer"
                        >
                          {lang === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={busyKey === `edit:${document.id}`}
                          className="py-2 rounded-full text-xs font-black bg-[#204E4A] text-[#E1E53F] cursor-pointer disabled:opacity-50"
                        >
                          {lang === 'es' ? 'Guardar' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#204E4A]/8 text-[#204E4A] flex items-center justify-center shrink-0">
                          <IconDocument size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold text-[#204E4A] truncate">
                            {document.title}
                          </p>
                          <p className="text-[10px] font-bold text-[#5C7470] mt-0.5">
                            {CATEGORY_LABELS[document.category][lang]}
                          </p>
                          <p className="text-[10px] text-[#5C7470] mt-1">
                            {formatBytes(document.sizeBytes)} · {formatDate(document.createdAt, lang)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => void openPreview(document)}
                          disabled={Boolean(busyKey)}
                          className="py-2 rounded-full bg-[#E1E53F]/45 text-[#204E4A] text-[11px] font-black cursor-pointer disabled:opacity-50"
                        >
                          {busyKey === `preview:${document.id}`
                            ? '…'
                            : (lang === 'es' ? 'Ver' : 'Preview')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadDocument(document)}
                          disabled={Boolean(busyKey)}
                          className="py-2 rounded-full bg-[#204E4A]/7 text-[#204E4A] text-[11px] font-black cursor-pointer disabled:opacity-50"
                        >
                          {lang === 'es' ? 'Descargar' : 'Download'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(document)}
                          disabled={Boolean(busyKey)}
                          className="py-2 rounded-full bg-[#204E4A]/7 text-[#204E4A] text-[11px] font-black cursor-pointer disabled:opacity-50"
                        >
                          {lang === 'es' ? 'Editar' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDocument(document)}
                          disabled={Boolean(busyKey)}
                          className="py-2 rounded-full bg-[#EC7357]/12 text-[#EC7357] text-[11px] font-black cursor-pointer disabled:opacity-50"
                        >
                          {busyKey === `delete:${document.id}`
                            ? (lang === 'es' ? 'Eliminando…' : 'Deleting…')
                            : (lang === 'es' ? 'Eliminar' : 'Delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 rounded-full bg-white border border-[#204E4A]/10 text-xs font-black text-[#204E4A] cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore
                    ? (lang === 'es' ? 'Cargando…' : 'Loading…')
                    : (lang === 'es' ? 'Cargar más' : 'Load more')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-[#102C29]/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-[1.75rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#204E4A]/10">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#204E4A] truncate">
                  {preview.document.title}
                </p>
                <p className="text-[10px] text-[#5C7470]">
                  {CATEGORY_LABELS[preview.document.category][lang]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(preview.url)
                  setPreview(null)
                }}
                className="w-9 h-9 rounded-full bg-[#204E4A]/8 text-[#204E4A] flex items-center justify-center cursor-pointer"
              >
                <IconClose size={17} />
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-[#F3F1ED] p-3 flex items-center justify-center overflow-auto">
              {preview.document.mimeType === 'application/pdf' ? (
                <iframe
                  src={preview.url}
                  title={preview.document.title}
                  className="w-full h-[72vh] bg-white rounded-xl"
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.document.title}
                  className="max-w-full max-h-[72vh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
