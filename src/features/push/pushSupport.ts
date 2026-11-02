export type PushEnvironment = 'in-app-browser' | 'ios-needs-install' | 'unsupported' | 'denied' | 'available'

export interface PushEnvironmentInput {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  permission: string | null
}

// Instagram, Facebook and similar apps open links in a browser that cannot show the permission prompt.
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|; wv\)/i

export const isIos = (userAgent: string, platform: string, maxTouchPoints: number) =>
  /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)

export function detectPushEnvironment(input: PushEnvironmentInput): PushEnvironment {
  if (IN_APP_BROWSER.test(input.userAgent)) return 'in-app-browser'
  // iOS exposes push only to a web app opened from the Home Screen.
  if (isIos(input.userAgent, input.platform, input.maxTouchPoints) && !input.standalone) return 'ios-needs-install'
  if (!input.hasServiceWorker || !input.hasPushManager || !input.hasNotification) return 'unsupported'
  return input.permission === 'denied' ? 'denied' : 'available'
}

export const urlBase64ToBytes = (value: string) => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export const bytesToUrlBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) return ''
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
