type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
type ObservabilityProperties = Record<string, JsonValue | undefined>

const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim() || ''
const apiHost =
  import.meta.env.VITE_POSTHOG_HOST?.trim()
  || 'https://us.i.posthog.com'
const releaseId = import.meta.env.VITE_APP_RELEASE?.trim() || 'development'

let currentUserId: string | null = null
let initialized = false
let memorySessionId: string | null = null

const redact = (value: string) =>
  value
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      '[redacted-email]',
    )
    .replace(
      /([?&](?:token|access_token|refresh_token|code|key|secret)=)[^&#\s]+/gi,
      '$1[redacted]',
    )
    .replace(
      /\b(?:eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g,
      '[redacted-jwt]',
    )

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const getSessionId = () => {
  if (memorySessionId) return memorySessionId

  const key = 'pazo_observability_session_id'

  try {
    const existing = sessionStorage.getItem(key)
    if (existing) {
      memorySessionId = existing
      return existing
    }

    const id = createSessionId()
    sessionStorage.setItem(key, id)
    memorySessionId = id
    return id
  } catch {
    memorySessionId = createSessionId()
    return memorySessionId
  }
}

const sanitizeProperties = (
  properties: ObservabilityProperties,
): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, JsonValue] =>
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
  const type = redact(error.name || 'Error')
  const message = redact(error.message || 'Unknown frontend error')
  const stack = error.stack ? redact(error.stack).slice(0, 8000) : null
  const mechanism = options.mechanism || 'unknown'
  const handled = options.handled ?? false
  const fingerprint = `${type}:${message}`.slice(0, 255)

  captureEvent('$exception', {
    $exception_level: 'error',
    $exception_fingerprint: fingerprint,
    $issue_name: type.slice(0, 255),
    $issue_description: message.slice(0, 255),
    $exception_list: [
      {
        type,
        value: message,
        mechanism: {
          handled,
          type: mechanism,
        },
      },
    ],
    error_stack: stack,
    component_stack: options.componentStack
      ? redact(options.componentStack).slice(0, 8000)
      : null,
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
