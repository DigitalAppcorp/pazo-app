import {beginTask} from '../../features/marketing/intelligenceRuntime'
import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

interface FollowButtonProps {
    currentPetId: string
    targetPetId: string
    lang?: 'es' | 'en'
    variant?: 'default' | 'profile' | 'feed'
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

        const finishObservation=beginTask('profile_follow')
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
            finishObservation('failure')
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
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 font-bold transition-all duration-300 ${variant === 'profile' ? 'min-h-14 py-3 text-[17px]' : 'py-2.5 text-sm'} ${variant === 'feed'
                    ? 'bg-transparent text-[#204E4A] shadow-none hover:bg-[#204E4A]/5'
                    : variant === 'profile' && isFollowing
                      ? 'bg-[#204E4A]/10 text-[#204E4A] shadow-none hover:bg-[#204E4A]/15'
                      : variant === 'profile'
                        ? 'bg-[#204E4A] text-white shadow-[0_5px_15px_rgba(32,78,74,0.16)] hover:bg-[#183d3a]'
                        : 'bg-[#204E4A] text-white shadow-md hover:bg-[#183d3a]'
                }`}
        >
            {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
                lang === 'es' ? 'Siguiendo' : 'Following'
            ) : (
                <>
                    {variant === 'profile' && (
                        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="9" cy="7" r="3.5" />
                            <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20M19.5 9v7M16 12.5h7" />
                        </svg>
                    )}
                    <span>{lang === 'es' ? 'Seguir' : 'Follow'}</span>
                </>
            )}
        </button>
    )
}
