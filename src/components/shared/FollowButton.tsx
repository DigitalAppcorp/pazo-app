import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

interface FollowButtonProps {
    currentPetId: string
    targetPetId: string
    lang?: 'es' | 'en'
    variant?: 'default' | 'profile'
    canFollow?: boolean
    onFollowChange?: (newIsFollowing: boolean) => void
}

export const FollowButton = ({ currentPetId, targetPetId, lang = 'es', variant = 'default', canFollow = true, onFollowChange }: FollowButtonProps) => {
    const [isFollowing, setIsFollowing] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isPending, setIsPending] = useState<boolean>(false)

    useEffect(() => {
        if (!canFollow || !currentPetId || !targetPetId || currentPetId === targetPetId) {
            setIsFollowing(false)
            setIsLoading(false)
            return
        }

        const checkFollowStatus = async () => {
            try {
                const { data } = await supabase
                    .from('follows')
                    .select('id')
                    .eq('follower_id', currentPetId)
                    .eq('following_id', targetPetId)
                    .maybeSingle()

                if (data) {
                    setIsFollowing(true)
                } else {
                    setIsFollowing(false)
                }
            } catch (error) {
                setIsFollowing(false)
            } finally {
                setIsLoading(false)
            }
        }

        checkFollowStatus()
    }, [canFollow, currentPetId, targetPetId])

    const handleToggleFollow = async () => {
        if (!canFollow || isLoading || isPending || !currentPetId || !targetPetId) return

        const previousState = isFollowing
        const newState = !previousState

        // Actualización optimista
        setIsPending(true)
        setIsFollowing(newState)
        onFollowChange?.(newState)

        try {
            if (!previousState) {
                // Acción: Seguir
                const { error } = await supabase
                    .from('follows')
                    .insert([{ follower_id: currentPetId, following_id: targetPetId }])
                if (error) throw error
            } else {
                // Acción: Dejar de seguir
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', currentPetId)
                    .eq('following_id', targetPetId)
                if (error) throw error
            }
        } catch (error) {
            console.error("Error toggling follow:", error)
            setIsFollowing(previousState) // Revertir si falla
            onFollowChange?.(previousState)
            alert(lang === 'es' ? 'Hubo un problema de conexión.' : 'Connection issue.')
        } finally {
            setIsPending(false)
        }
    }

    // Regla 1: No puedes seguirte a ti mismo ni a otra mascota de tu misma cuenta
    if (!canFollow || currentPetId === targetPetId) return null
    // Regla 2: Evitar parpadeos mientras carga
    if (isLoading) return null
    // Regla 3: En feed/default, si ya lo sigo el botón desaparece. En perfil, siempre visible.
    if (isFollowing && variant !== 'profile') return null

    return (
        <button
            onClick={handleToggleFollow}
            disabled={isPending}
            className={`w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${isFollowing && variant === 'profile'
                    ? 'bg-transparent border-2 border-[#204E4A]/20 text-[#204E4A] hover:bg-[#204E4A]/5'
                    : 'bg-[#204E4A] text-white shadow-md hover:bg-[#183d3a]'
                }`}
        >
            {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
                lang === 'es' ? 'Siguiendo' : 'Following'
            ) : (
                lang === 'es' ? 'Seguir' : 'Follow'
            )}
        </button>
    )
}