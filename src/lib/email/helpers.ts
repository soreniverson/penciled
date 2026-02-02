import { formatInTimeZone } from 'date-fns-tz'

/**
 * HTML escape to prevent XSS in email templates
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '#'
    }
    return url
  } catch {
    return '#'
  }
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbr(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    const tzPart = parts.find(p => p.type === 'timeZoneName')
    return tzPart?.value || timezone
  } catch {
    return timezone
  }
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'EEEE, MMMM d, yyyy')
}

/**
 * Format time range for email display
 */
export function formatEmailTimeRange(startTime: Date, endTime: Date, timezone: string): string {
  const tzAbbr = getTimezoneAbbr(timezone)
  return `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
}

/**
 * Common email data type
 */
export type BaseEmailData = {
  bookingId: string
  managementToken: string
  meetingName: string
  providerName: string
  providerEmail: string
  clientName: string
  clientEmail: string
  startTime: Date
  endTime: Date
  timezone: string
  notes?: string | null
  meetingLink?: string | null
}
