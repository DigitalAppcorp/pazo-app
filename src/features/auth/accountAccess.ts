export const canUseAccountFeatures = (userId: string | null | undefined, isDemo: boolean) =>
  Boolean(userId) && !isDemo
