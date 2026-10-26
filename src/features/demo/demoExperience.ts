import type { Pet, Post, PostComment } from '../../types/pazo'
import { INITIAL_PETS, INITIAL_POSTS } from '../../data/mockData.ts'

// Examples live only in component memory. No Supabase identity, content or
// engagement event can be created by these functions.
export const createDemoPets = (): Pet[] => {
  const pets: Pet[] = INITIAL_PETS.map((pet) => ({
    ...pet, interests: pet.interests ? [...pet.interests] : undefined,
  }))
  // The rabbit already exists in the original sample feed; supply a
  // navigable local profile rather than attempting a real Supabase lookup.
  const rabbitPost = INITIAL_POSTS.find((post) => post.petId === 'pet-nube')
  if (rabbitPost && !pets.some((pet) => pet.id === rabbitPost.petId)) {
    pets.push({
      id: rabbitPost.petId,
      name: rabbitPost.petName,
      species: rabbitPost.petSpecies,
      age: '—',
      photoUrl: rabbitPost.petAvatar,
      qrId: 'PAZO-DEMO-NUBE',
    })
  }
  return pets
}

export const createDemoPosts = (): Post[] =>
  INITIAL_POSTS.map((post) => ({
    ...post,
    comments: post.comments.map((comment) => ({ ...comment })),
    commentsCount: post.comments.length,
    commentsLoaded: true,
    isLiked: false,
    isSaved: false,
  }))

export const toggleDemoLike = (posts: Post[], targetId: string): Post[] =>
  posts.map((post) => {
    if (post.id !== targetId) return post
    const nextLiked = !post.isLiked
    return {
      ...post,
      isLiked: nextLiked,
      likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
    }
  })

export const toggleDemoSave = (posts: Post[], targetId: string): Post[] =>
  posts.map((post) =>
    post.id === targetId ? { ...post, isSaved: !post.isSaved } : post
  )

export const appendDemoComment = (posts: Post[], targetId: string, comment: PostComment): Post[] =>
  posts.map((post) =>
    post.id === targetId
      ? {
          ...post,
          comments: [...post.comments, comment],
          commentsCount: (post.commentsCount ?? post.comments.length) + 1,
          commentsLoaded: true,
        }
      : post
  )
