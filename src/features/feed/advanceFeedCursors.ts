export interface FeedCursor {
  socialOffset: number
  recommendationOffset: number
  socialExhausted: boolean
  recommendationExhausted: boolean
}

export interface FeedConsumption {
  consumedSocial: number
  consumedRecommendations: number
}

// Calculate the next state without modifying the last committed cursor.
// The caller commits this result only after the entire page was loaded.
export function advanceFeedCursors<T extends FeedCursor>(
  current: T,
  consumed: FeedConsumption,
  socialRowsCount: number,
  recommendationRowsCount: number,
  pageSize: number,
): T {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('pageSize must be a positive integer')
  }
  return {
    ...current,
    socialOffset: current.socialOffset + consumed.consumedSocial,
    recommendationOffset: current.recommendationOffset + consumed.consumedRecommendations,
    socialExhausted: current.socialExhausted || socialRowsCount === 0
      || (socialRowsCount < pageSize && consumed.consumedSocial >= socialRowsCount),
    recommendationExhausted: current.recommendationExhausted || recommendationRowsCount === 0
      || (recommendationRowsCount < pageSize && consumed.consumedRecommendations >= recommendationRowsCount),
  }
}
