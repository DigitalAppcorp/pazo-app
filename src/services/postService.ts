import { supabase } from './supabaseClient'
import type { Post } from '../types/pazo'

export const fetchSmartFeed = async (userId: string, userInterests: string[]): Promise<Post[]> => {
    // 1. Obtener los IDs de las mascotas que el usuario sigue
    const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

    const followingIds = follows?.map(f => f.following_id) || []

    // 2. Traer publicaciones de las cuentas seguidas (Feed cronológico principal)
    const { data: followedPosts } = await supabase
        .from('posts')
        .select('*')
        .in('pet_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(10)

    // 3. Traer publicaciones RECOMENDADAS (Inyección algorítmica por intereses o alta interacción)
    const { data: recommendedPosts } = await supabase
        .from('posts')
        .select('*')
        .not('pet_id', 'in', `(${[...followingIds, userId].join(',')})`)
        .overlaps('tags', userInterests.length > 0 ? userInterests : ['Comunidades de gatos'])
        .order('likes', { ascending: false })
        .limit(3)

    // 4. Mapear y etiquetar los posts seguidos
    const formattedFollowed: Post[] = (followedPosts || []).map((p: any) => ({
        id: p.id,
        petId: p.pet_id,
        petName: p.pet_name,
        petSpecies: p.pet_species,
        petAvatar: p.pet_avatar,
        location: p.location,
        timeAgo: 'Hace un momento',
        createdAt: p.created_at,
        isRecommended: false,
        tags: p.tags || [],
        text: p.text,
        photoUrl: p.photo_url,
        likes: p.likes,
        isLiked: false,
        isSaved: false,
        comments: p.comments || [],
    }))

    // 5. Mapear y etiquetar los posts recomendados con la insignia algorítmica
    const formattedRecommended: Post[] = (recommendedPosts || []).map((p: any) => ({
        id: p.id,
        petId: p.pet_id,
        petName: p.pet_name,
        petSpecies: p.pet_species,
        petAvatar: p.pet_avatar,
        location: p.location,
        timeAgo: 'Hace un momento',
        createdAt: p.created_at,
        isRecommended: true, // <--- Esto activa la etiqueta "Sugerencia" en la interfaz
        tags: p.tags || [],
        text: p.text,
        photoUrl: p.photo_url,
        likes: p.likes,
        isLiked: false,
        isSaved: false,
        comments: p.comments || [],
    }))

    // 6. Mezclar inteligentemente intercalando recomendaciones en el feed
    const smartFeed = [...formattedFollowed]
    if (formattedRecommended.length > 0 && smartFeed.length > 2) {
        // Inyecta una sugerencia en la tercera posición (como Instagram)
        smartFeed.splice(2, 0, formattedRecommended[0])
    } else {
        smartFeed.push(...formattedRecommended)
    }

    return smartFeed
}