// Request lifetimes, independent of IDs: A -> B -> A must retire the first A.
export function createRequestScope() {
  let epoch = 0
  const versions = new Map<string, number>()
  return {
    invalidate(key?: string) {
      if (key) versions.set(key, (versions.get(key) ?? 0) + 1)
      else { epoch++; versions.clear() }
    },
    capture(key?: string, replace = false) {
      const started = epoch
      if (key && replace) versions.set(key, (versions.get(key) ?? 0) + 1)
      const version = key ? versions.get(key) : undefined
      return () => started === epoch && (!key || versions.get(key) === version)
    },
  }
}
