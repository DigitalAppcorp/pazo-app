// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const MAX_BODY_BYTES = 256 * 1024
const PAYPAL_EVENT_TYPES = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
])

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const getPaypalBaseUrl = () =>
  Deno.env.get('PAYPAL_ENV') === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

const getSupabaseSecretKey = () => {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // Fall back to the legacy key while the project completes key migration.
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

const getPaypalAccessToken = async (
  clientId: string,
  clientSecret: string,
) => {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed with status ${response.status}`)
  }

  const data = await response.json() as { access_token?: string }
  if (!data.access_token) throw new Error('PayPal OAuth returned no access token')
  return data.access_token
}

const verifyPaypalWebhook = async (
  req: Request,
  event: Record<string, unknown>,
  accessToken: string,
  webhookId: string,
) => {
  const authAlgo = req.headers.get('paypal-auth-algo')
  const certUrl = req.headers.get('paypal-cert-url')
  const transmissionId = req.headers.get('paypal-transmission-id')
  const transmissionSig = req.headers.get('paypal-transmission-sig')
  const transmissionTime = req.headers.get('paypal-transmission-time')

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false
  }

  const response = await fetch(
    `${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`PayPal webhook verification failed with status ${response.status}`)
  }

  const data = await response.json() as { verification_status?: string }
  return data.verification_status === 'SUCCESS'
}

const getSubscriptionId = (event: Record<string, any>) => {
  const type = String(event.event_type || '')
  const resource = event.resource || {}

  if (type.startsWith('BILLING.SUBSCRIPTION.')) {
    return typeof resource.id === 'string' ? resource.id : null
  }

  if (type.startsWith('PAYMENT.SALE.')) {
    return typeof resource.billing_agreement_id === 'string'
      ? resource.billing_agreement_id
      : null
  }

  return null
}

const getSubscription = async (
  subscriptionId: string,
  accessToken: string,
) => {
  const response = await fetch(
    `${getPaypalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`PayPal subscription lookup failed with status ${response.status}`)
  }

  return await response.json() as {
    id?: string
    plan_id?: string
    custom_id?: string
    status?: string
  }
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const contentLength = Number(req.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413)
  }

  const rawBody = await req.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413)
  }

  let event: Record<string, any>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') || ''
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID') || ''
  const expectedPlanId = Deno.env.get('PAYPAL_PLAN_ID') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseSecretKey = getSupabaseSecretKey()

  if (
    !clientId
    || !clientSecret
    || !webhookId
    || !expectedPlanId
    || !supabaseUrl
    || !supabaseSecretKey
  ) {
    console.error('PayPal webhook is not fully configured')
    return json({ error: 'Webhook not configured' }, 503)
  }

  try {
    const accessToken = await getPaypalAccessToken(clientId, clientSecret)
    const isVerified = await verifyPaypalWebhook(
      req,
      event,
      accessToken,
      webhookId,
    )

    if (!isVerified) {
      return json({ error: 'Invalid PayPal signature' }, 401)
    }

    const eventType = String(event.event_type || '')
    if (!PAYPAL_EVENT_TYPES.has(eventType)) {
      return json({ received: true, ignored: true })
    }

    const subscriptionId = getSubscriptionId(event)
    if (!subscriptionId) {
      console.warn('Verified PayPal event has no subscription id', {
        eventType,
        eventId: event.id || null,
      })
      return json({ received: true, ignored: true })
    }

    const subscription = await getSubscription(subscriptionId, accessToken)

    if (subscription.plan_id !== expectedPlanId) {
      console.warn('Verified PayPal event belongs to an unexpected plan', {
        eventType,
        eventId: event.id || null,
      })
      return json({ received: true, ignored: true })
    }

    const userId = String(subscription.custom_id || '')
    if (!isUuid(userId)) {
      console.error('Verified PayPal subscription has invalid custom_id', {
        eventType,
        eventId: event.id || null,
      })
      return json({ error: 'Invalid subscription owner' }, 422)
    }

    const status = String(subscription.status || '').toUpperCase()
    const isFounder = status === 'ACTIVE'

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_founder: isFounder,
        paypal_subscription_id: subscription.id || subscriptionId,
      })
      .eq('id', userId)

    if (error) throw error

    return json({
      received: true,
      verified: true,
      membership_active: isFounder,
    })
  } catch (error) {
    console.error('PayPal webhook processing failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
      eventId: event?.id || null,
      eventType: event?.event_type || null,
    })

    return json({ error: 'Webhook processing failed' }, 500)
  }
})
