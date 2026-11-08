import { useEffect, useState } from 'react'
import { pushOfferClosedHere, pushOfferKind, rememberPushOfferClosed, type PushOfferKind } from './pushOffer'
import { pushTurnedOffHere, readPushEnvironment, readPushStatus } from './pushService'

/** Decides once per moment of eligibility whether to invite this person to turn alerts on. */
export function usePushOffer(eligible: boolean): { kind: PushOfferKind | null; ready: boolean; close: () => void } {
  const [wasEligible, setWasEligible] = useState(eligible)
  const [result, setResult] = useState<{ kind: PushOfferKind | null } | null>(null)
  if (wasEligible !== eligible) {
    setWasEligible(eligible)
    setResult(null)
  }
  const suppressed = pushOfferClosedHere() || pushTurnedOffHere()

  useEffect(() => {
    if (!eligible || pushOfferClosedHere() || pushTurnedOffHere()) return
    let alive = true
    const environment = readPushEnvironment()
    void readPushStatus().then((status) => {
      if (alive) setResult({ kind: pushOfferKind({ environment, active: status.active, enabled: status.enabled, closed: false }) })
    })
    return () => { alive = false }
  }, [eligible])

  const close = () => {
    rememberPushOfferClosed()
    setResult({ kind: null })
  }
  return { kind: eligible && !suppressed ? result?.kind ?? null : null, ready: eligible && (suppressed || result !== null), close }
}
