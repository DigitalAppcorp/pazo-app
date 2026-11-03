// 21:00-08:00 in Los Angeles: health alert pushes wait for the morning (server rule
// push_private.next_daytime). Mirrored here only to warn the administrator before sending.
export const isQuietHours = (now = new Date()) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(now))
  return hour >= 21 || hour < 8
}
