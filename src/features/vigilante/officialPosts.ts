// Official PAZO posts published by the Vigilante. Pure helpers, no network.

export type OfficialPriority = 'high' | 'medium' | 'low'

export interface OfficialPost {
  id: string
  title: string
  body: string
  sourceName: string
  sourceUrl: string
  sourcePublishedAt: string
  priority: OfficialPriority
  publishedAt: string
  expiresAt: string | null
  likes: number
  isLiked: boolean
}

interface OfficialPostRow {
  id: string
  title: string
  body: string
  source_name: string
  source_url: string
  source_published_at: string
  priority: string
  published_at: string
  expires_at: string | null
  likes: number | string | null
  liked: boolean | null
}

const PRIORITIES: readonly OfficialPriority[] = ['high', 'medium', 'low']

// A row with an unexpected priority or a non-https source is dropped rather than shown.
export const mapOfficialPostRow = (row: OfficialPostRow): OfficialPost | null => {
  if (!PRIORITIES.includes(row.priority as OfficialPriority)) return null
  if (!/^https:\/\//.test(row.source_url)) return null
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    priority: row.priority as OfficialPriority,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    likes: Number(row.likes) || 0,
    isLiked: Boolean(row.liked),
  }
}

export type FeedEntry<T> = { kind: 'official'; post: OfficialPost } | { kind: 'post'; post: T }

// High-priority alerts stay above the feed; the rest sit after the first two posts,
// newest first, the way a followed account's posts would appear.
// A function declaration, not a generic arrow: some test loaders compile .ts files as TSX.
export function placeOfficialPosts<T>(posts: readonly T[], official: readonly OfficialPost[]): FeedEntry<T>[] {
  const high = official.filter((post) => post.priority === 'high')
  const rest = official
    .filter((post) => post.priority !== 'high')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const entries: FeedEntry<T>[] = posts.map((post) => ({ kind: 'post', post }))
  entries.splice(Math.min(2, entries.length), 0, ...rest.map((post) => ({ kind: 'official' as const, post })))
  return [...high.map((post) => ({ kind: 'official' as const, post })), ...entries]
}
