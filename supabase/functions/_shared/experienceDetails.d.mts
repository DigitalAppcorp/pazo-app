export const EXPERIENCE_DETAILS: {
  signup_failure: readonly ['missing_fields','age_required','password_mismatch','weak_password','email_taken','invalid_email','rate_limited','network','google_age','google_cancelled','google_failed','unconfirmed_login','other']
  demo_last_screen: readonly ['home','pet','communities','places','explore']
  arrival_source: readonly ['search','social','direct','installed','other']
}
export type ExperienceDetailKind = keyof typeof EXPERIENCE_DETAILS
export type SignupFailure = typeof EXPERIENCE_DETAILS.signup_failure[number]
export type DemoScreen = typeof EXPERIENCE_DETAILS.demo_last_screen[number]
export type ArrivalSource = typeof EXPERIENCE_DETAILS.arrival_source[number]
export function validExperienceDetail(kind: unknown, value: unknown): boolean
export function classifyArrival(referrer: string, ownHost: string, standalone?: boolean): ArrivalSource | null
export function signupFailureFromCode(code: unknown): SignupFailure
