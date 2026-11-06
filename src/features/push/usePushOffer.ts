import { useEffect, useState } from 'react'
import { pushOfferClosedHere, pushOfferKind, rememberPushOfferClosed, type PushOfferKind } from './pushOffer'
import { pushTurnedOffHere, readPushEnvironment, readPushStatus } from './pushService'

/** Decides once per moment of eligibility whether to invite this person to turn alerts on. */
export function usePushOffer(eligible: boolean): { kind: PushOfferKind | null; close: () => void } {
  const [kind, setKind] = useState<PushOfferKind | null>(null)

  useEffect(() => {
    if (!eligible || pushOfferClosedHere() || pushTurnedOffHere()) return
    let alive = true
    const environment = readPushEnvironment()
    void readPushStatus().then((status) => {
      if (alive) setKind(pushOfferKind({ environment, active: status.active, enabled: status.enabled, closed: false }))
    })
    return () => { alive = false }
  }, [eligible])

  const close = () => {
    rememberPushOfferClosed()
    setKind(null)
  }
  return { kind: eligible ? kind : null, close }
}
