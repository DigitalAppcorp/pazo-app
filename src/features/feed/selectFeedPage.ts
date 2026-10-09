// A mixed Feed page can fetch more rows than it renders. Advance each
// source cursor only past emitted or safely discarded records.
export interface FeedPageEntry<T> {
  item: T
  recommended: boolean
}
interface IndexedEntry<T> {
  item: T
  index: number
}
export interface FeedPageSelection<T> {
  entries: FeedPageEntry<T>[]
  consumedSocial: number
  consumedRecommendations: number
}
export function selectFeedPage<T extends { id: string }>(
  socialRows: readonly T[],
  recommendationRows: readonly T[],
  pageSize: number,
  previouslySeen: ReadonlySet<string>,
  isVisible: (row: T) => boolean,
): FeedPageSelection<T> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('pageSize must be a positive integer')
  }
  const socialIds = new Set<string>()
  const social: IndexedEntry<T>[] = []
  socialRows.forEach((item, index) => {
    if (previouslySeen.has(item.id) || !isVisible(item) || socialIds.has(item.id)) return
    socialIds.add(item.id)
    social.push({ item, index })
  })
  const recommendationIds = new Set<string>()
  const recommendations: IndexedEntry<T>[] = []
  recommendationRows.forEach((item, index) => {
    if (previouslySeen.has(item.id) || !isVisible(item) || socialIds.has(item.id)
      || recommendationIds.has(item.id)) return
    recommendationIds.add(item.id)
    recommendations.push({ item, index })
  })
  const entries: FeedPageEntry<T>[] = []
  let socialUsed = 0
  let recommendationUsed = 0
  const frequency = social.length <= 3 ? 2 : 4
  while (socialUsed < social.length && entries.length < pageSize) {
    entries.push({ item: social[socialUsed].item, recommended: false })
    socialUsed++
    if (socialUsed % frequency === 0
      && recommendationUsed < recommendations.length
      && entries.length < pageSize) {
      entries.push({ item: recommendations[recommendationUsed].item, recommended: true })
      recommendationUsed++
    }
  }
  while (recommendationUsed < recommendations.length && entries.length < pageSize) {
    entries.push({ item: recommendations[recommendationUsed].item, recommended: true })
    recommendationUsed++
  }
  const consumedSocial = socialUsed > 0
    ? social[socialUsed - 1].index + 1
    : (social[0]?.index ?? socialRows.length)
  const consumedRecommendations = recommendationUsed > 0
    ? recommendations[recommendationUsed - 1].index + 1
    : (recommendations[0]?.index ?? recommendationRows.length)
  return { entries, consumedSocial, consumedRecommendations }
}
