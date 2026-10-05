import { useEffect, useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import type { Pet } from '../../types/pazo'
import {
  buildPublicRescueUrl,
  getPetPublicToken,
  rotatePetPublicToken,
} from '../../services/rescueService'
import { IconShield, IconClose } from '../icons/PazoIcons'

interface PassportModalProps {
  isOpen: boolean
  onClose: () => void
  pet: Pet
  lang: 'es' | 'en'
}

const PazoQr = ({ value, title }: { value: string; title: string }) => {
  const matrix = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value, 'Byte')
    qr.make()

    const size = qr.getModuleCount()
    const cells: Array<{ row: number; col: number }> = []

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (qr.isDark(row, col)) cells.push({ row, col })
      }
    }

    return { size, cells }
  }, [value])

  const margin = 4
  const viewBoxSize = matrix.size + margin * 2

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      <title>{title}</title>
      <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />
      <g transform={`translate(${margin} ${margin})`} fill="#204E4A">
        {matrix.cells.map(({ row, col }) => (
          <rect key={`${row}-${col}`} x={col} y={row} width="1" height="1" />
        ))}
      </g>
    </svg>
  )
}

export const PassportModal = ({ isOpen, onClose, pet, lang }: PassportModalProps) => {
  const [publicUrl, setPublicUrl] = useState('')
  const [publicToken, setPublicToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRotating, setIsRotating] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !pet.id) return

    let active = true

    const loadLink = async () => {
      setIsLoading(true)
      setError('')

      try {
        const token = await getPetPublicToken(pet.id)
        if (active) {
          setPublicToken(token)
          setPublicUrl(buildPublicRescueUrl(token))
        }
      } catch (err) {
        console.error('Error loading pet QR link:', err)
        if (active) {
          setError(lang === 'es' ? 'No se pudo cargar el QR.' : 'Could not load QR.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadLink()

    return () => {
      active = false
    }
  }, [isOpen, pet.id, lang])

  if (!isOpen) return null

  const handleShare = async () => {
    if (!publicUrl) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pazo · ${pet.name}`,
          text: lang === 'es' ? 'Pasaporte QR de Pazo' : 'Pazo QR passport',
          url: publicUrl,
        })
      } else {
        await navigator.clipboard.writeText(publicUrl)
        alert(lang === 'es' ? 'Enlace copiado.' : 'Link copied.')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error sharing rescue link:', err)
      }
    }
  }

  const handleRotateQr = async () => {
    if (isRotating) return

    const confirmed = window.confirm(
      lang === 'es'
        ? 'El QR anterior dejará de funcionar. ¿Deseas generar uno nuevo?'
        : 'The previous QR will stop working. Generate a new one?'
    )

    if (!confirmed) return

    setIsRotating(true)
    setError('')

    try {
      const token = await rotatePetPublicToken(pet.id)
      setPublicToken(token)
      setPublicUrl(buildPublicRescueUrl(token))
    } catch (err: any) {
      console.error('Error rotating pet QR:', err)
      setError(
        lang === 'es'
          ? 'No se pudo regenerar el QR.'
          : 'Could not regenerate QR.'
      )
    } finally {
      setIsRotating(false)
    }
  }

  const handleDownloadQr = () => {
    const svg = qrContainerRef.current?.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${pet.name.toLowerCase().replace(/\s+/g, '-')}-pazo-qr.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
              {lang === 'es' ? 'Identidad Segura' : 'Secure ID'}
            </span>
            <h3 className="text-xl font-black text-[#204E4A] mt-1">
              {lang === 'es' ? `Pasaporte de ${pet.name}` : `${pet.name}'s Passport`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs"
          >
            <IconClose size={15} />
          </button>
        </div>

        <div className="p-6 bg-[#FAF8F5] rounded-[2.2rem] text-center space-y-4 shadow-xs">
          <div
            ref={qrContainerRef}
            className="w-44 h-44 bg-white rounded-2xl mx-auto p-4 shadow-md flex items-center justify-center"
          >
            {isLoading ? (
              <span className="text-xs font-bold text-[#5C7470]">
                {lang === 'es' ? 'Generando QR…' : 'Generating QR…'}
              </span>
            ) : publicUrl ? (
              <PazoQr value={publicUrl} title={`Pazo · ${pet.name}`} />
            ) : (
              <span className="text-xs font-bold text-[#EC7357]">
                {error || (lang === 'es' ? 'QR no disponible' : 'QR unavailable')}
              </span>
            )}
          </div>

          <div>
            <span className="font-extrabold text-sm text-[#204E4A] block">
              {pet.name}
            </span>
            <span className="text-[10px] text-[#5C7470] block mt-1">
              {lang === 'es'
                ? 'Pon este QR en su placa o collar.'
                : 'Place this QR on their tag or collar.'}
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#FAF8F5] rounded-2xl text-[#5C7470] text-[11px] leading-relaxed shadow-xs flex items-start gap-2">
          <IconShield size={16} className="text-[#204E4A] shrink-0 mt-0.5" />
          <span>
            {lang === 'es'
              ? `Si alguien encuentra a ${pet.name}, puede escanear este QR y enviarte un aviso.`
              : `If someone finds ${pet.name}, they can scan this QR and send you a notice.`}
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              if (!publicToken) return
              window.location.href = buildPublicRescueUrl(publicToken, 'preview')
            }}
            disabled={!publicUrl}
            className="w-full bg-[#204E4A] disabled:opacity-50 text-[#E1E53F] font-extrabold py-3.5 rounded-full text-xs shadow-md cursor-pointer"
          >
            {lang === 'es' ? 'Vista previa pública' : 'Public preview'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadQr}
              disabled={!publicUrl}
              className="bg-[#E1E53F] disabled:opacity-50 text-[#204E4A] font-extrabold py-3 rounded-full text-xs cursor-pointer"
            >
              {lang === 'es' ? 'Descargar QR' : 'Download QR'}
            </button>
            <button
              onClick={handleShare}
              disabled={!publicUrl}
              className="bg-[#FAF8F5] disabled:opacity-50 text-[#204E4A] font-extrabold py-3 rounded-full text-xs cursor-pointer"
            >
              {lang === 'es' ? 'Compartir' : 'Share'}
            </button>
          <button
            onClick={handleRotateQr}
            disabled={!publicUrl || isRotating}
            className="col-span-2 w-full mt-1 text-[10px] font-bold text-[#5C7470] hover:text-[#204E4A] disabled:opacity-50 cursor-pointer"
          >
            {isRotating
              ? (lang === 'es' ? 'Regenerando…' : 'Regenerating…')
              : (lang === 'es' ? 'Regenerar QR e invalidar el anterior' : 'Regenerate QR and invalidate previous link')}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
