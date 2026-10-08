import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { block, getSafety, hide, unblock, unhide, type SafetySnapshot } from './socialSafety'
const EMPTY: SafetySnapshot = { blockedIds: [], ownBlockIds: [], hiddenIds: [] }
export function useSocialSafety(userId?: string) {
  const [data, setData] = useState<SafetySnapshot>(EMPTY)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const serial = ++version.current
    setReady(false)
    try {
      const next = userId ? await getSafety() : EMPTY
      if (serial === version.current) { setData(next); setReady(true); setError('') }
    } catch (caught) {
      if (serial === version.current) {
        setReady(false)
        setError(caught instanceof Error ? caught.message : 'Safety unavailable')
      }
    }
  }, [userId])
  useEffect(() => {
    setData(EMPTY); setReady(false); void refresh()
    return () => { version.current += 1 }
  }, [refresh])
  const action = useCallback(async (job: () => Promise<void>) => {
    if (!ready) throw new Error('Safety unavailable')
    await job(); await refresh()
  }, [ready, refresh])
  return {
    ready, error, refresh,
    blockedIds: useMemo(() => new Set(data.blockedIds), [data.blockedIds]),
    ownBlockIds: useMemo(() => new Set(data.ownBlockIds), [data.ownBlockIds]),
    hiddenIds: useMemo(() => new Set(data.hiddenIds), [data.hiddenIds]),
    block: (id: string) => action(() => block(id)),
    unblock: (id: string) => action(() => unblock(id)),
    hide: (id: string) => action(() => hide(id)),
    unhide: (id: string) => action(() => unhide(id)),
  }
}
