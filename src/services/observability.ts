type ObservabilityValue = string | number | boolean | null
type ObservabilityProperties = Record<string, ObservabilityValue | undefined>

const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim() || ''
const apiHost =
  import.meta.env.VITE_POSTHOG_HOST?.trim()
  || 'https://us.i.posthog.com'
const releaseId = import.meta.env.VITE_APP_RELEASE?.trim() || 'development'

let currentUserId: string | null = null
let initialized = false

const getSessionId = () => {
  const key = 'pazo_observability_session_id'
  const existing = sessionStorage.getItem(key)
  if (existing) return existing

  const id = crypto.randomUUID()
  sessionStorage.setItem(key, id)
  return id
}

const sanitizeProperties = (
  properties: ObservabilityProperties,
): Record<string, ObservabilityValue> =>
  Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, ObservabilityValue] =>
        entry[1] !== undefined,
    ),
  )

const getDistinctId = () =>
  currentUserId || `anonymous:${getSessionId()}`

export const isObservabilityEnabled = () => Boolean(projectToken)

export const setObservabilityUser = (userId: string | null) => {
  currentUserId = userId
}

export const captureEvent = (
  event: string,
  properties: ObservabilityProperties = {},
) => {
  if (!isObservabilityEnabled()) return

  const payload = {
    api_key: projectToken,
    event,
    properties: {
      distinct_id: getDistinctId(),
      pazo_session_id: getSessionId(),
      pazo_release: releaseId,
      app: 'pazo',
      ...sanitizeProperties(properties),
    },
  }

  void fetch(`${apiHost.replace(/\/$/, '')}/i/v0/e`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Observability must never break the product.
  })
}

const toError = (value: unknown) => {
  if (value instanceof Error) return value

  if (typeof value === 'string') {
    return new Error(value)
  }

  return new Error('Unknown frontend error')
}

export const captureException = (
  value: unknown,
  options: {
    handled?: boolean
    mechanism?: string
    componentStack?: string | null
  } = {},
) => {
  const error = toError(value)
  const type = error.name || 'Error'
  const message = error.message || 'Unknown frontend error'
  const fingerprint = `${type}:${message}`.slice(0, 255)

  captureEvent('$exception', {
    $exception_level: 'error',
    $exception_fingerprint: fingerprint,
    $issue_name: type.slice(0, 255),
    $issue_description: message.slice(0, 255),
    error_type: type,
    error_message: message.slice(0, 1000),
    error_stack: error.stack?.slice(0, 8000),
    error_handled: options.handled ?? false,
    error_mechanism: options.mechanism || 'unknown',
    component_stack: options.componentStack?.slice(0, 8000),
  })
}

export const initializeObservability = () => {
  if (initialized) return
  initialized = true

  captureEvent('app_boot', {
    environment: import.meta.env.MODE,
  })

  window.addEventListener('error', (event) => {
    captureException(event.error || event.message, {
      handled: false,
      mechanism: 'window.error',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, {
      handled: false,
      mechanism: 'unhandledrejection',
    })
  })
}
