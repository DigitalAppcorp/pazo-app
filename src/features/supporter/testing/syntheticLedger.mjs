// Isolated F16 reconciliation model for synthetic testing only.
// NO PayPal network requests, persistence, webhooks or production entitlements.
export function createSyntheticLedger() {
  const events = new Set()
  const payments = new Map()
  return {
    acceptEvent(event) {
      if (!event.signatureValid) return { accepted: false, reason: 'invalid_signature' }
      if (events.has(event.id)) return { accepted: true, duplicate: true }
      events.add(event.id)
      return { accepted: true, duplicate: false }
    },
    reconcile(payment, expected) {
      if (!payment.providerConfirmed || payment.status !== 'COMPLETED' ||
        payment.ownerId !== expected.ownerId || payment.merchant !== expected.merchant ||
        payment.plan !== expected.plan || payment.amountMinor !== 299 ||
        payment.currency !== 'USD' || !(payment.periodEnd > payment.periodStart)) {
        return { credited: false }
      }
      const key = payment.provider + ':' + payment.id
      const existing = payments.get(key)
      if (existing?.reversed) return { credited: false }
      if (existing) return { credited: false, duplicate: true }
      payments.set(key, { ...payment, reversed: false })
      return { credited: true }
    },
    reverse(provider, paymentId) {
      const p = payments.get(provider + ':' + paymentId)
      if (!p) return false
      p.reversed = true
      return true
    },
    active(ownerId, now) {
      return [...payments.values()].some(p => p.ownerId === ownerId && !p.reversed &&
        p.periodStart <= now && now < p.periodEnd)
    },
    paidIntervals(ownerId) {
      // Union of verified periods; overlapping providers cannot double-count days.
      const ranges = [...payments.values()].filter(p => p.ownerId === ownerId && !p.reversed)
        .map(p => [p.periodStart, p.periodEnd]).sort((a,b) => a[0]-b[0])
      const result = []
      for (const [start,end] of ranges) {
        const last = result.at(-1)
        if (last && start <= last[1]) last[1] = Math.max(last[1],end)
        else result.push([start,end])
      }
      return result
    },
    countPayments() { return payments.size },
  }
}
