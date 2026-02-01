import { Resend } from 'resend'
import { formatInTimeZone } from 'date-fns-tz'

const resend = new Resend(process.env.RESEND_API_KEY)

// HTML escape to prevent XSS in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Sanitize URL to prevent javascript: and data: protocols
function sanitizeUrl(url: string): string {
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

// Helper to get timezone abbreviation (e.g., "PST", "EST")
function getTimezoneAbbr(timezone: string): string {
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

const FROM_EMAIL = process.env.EMAIL_FROM || 'penciled.fyi <noreply@penciled.fyi>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

type BookingEmailData = {
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

export async function sendBookingConfirmationToClient(data: BookingEmailData) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, meetingLink, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeMeetingLink = meetingLink ? sanitizeUrl(meetingLink) : null

  const meetingLinkHtml = safeMeetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${safeMeetingLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeMeetingLink)}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking confirmed with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Confirmed</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been confirmed.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
          </div>

          ${meetingLinkHtml}

          <p style="margin-bottom: 24px;">
            Need to make changes?
            <a href="${manageUrl}" style="color: #1a1a1a;">Manage your booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send client confirmation email:', error)
    return false
  }
}

export async function sendBookingNotificationToProvider(data: BookingEmailData) {
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, notes, managementToken, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeNotes = notes ? escapeHtml(notes) : null

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `New booking: ${safeMeetingName} with ${safeClientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">New Booking</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">You have a new booking!</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${safeClientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
          </div>
          ${safeNotes ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px;"><strong>Notes from client:</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${safeNotes}</p>
          </div>
          ` : ''}
          <p style="margin-bottom: 16px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View in Dashboard</a>
          </p>

          <p style="margin-bottom: 24px;">
            Need to make changes? <a href="${manageUrl}" style="color: #1a1a1a;">Reschedule or cancel this booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send provider notification email:', error)
    return false
  }
}

export async function sendCancellationEmailToClient(data: BookingEmailData & { reason?: string }) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, reason, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeReason = reason ? escapeHtml(reason) : null

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking cancelled with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Cancelled</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been cancelled.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
            ${safeReason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>

          <p style="margin-bottom: 24px;">
            If you'd like to reschedule, please visit the booking page.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send cancellation email to client:', error)
    return false
  }
}

// Booking request emails (for request mode)
export async function sendBookingRequestToClient(data: BookingEmailData) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking request sent to ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Request Sent</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Your booking request has been sent to ${safeProviderName}. You'll receive an email once they confirm.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Status:</strong> Pending confirmation</p>
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
          </div>

          <p style="margin-bottom: 24px;">
            <a href="${manageUrl}" style="color: #1a1a1a;">View your booking request</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send booking request email to client:', error)
    return false
  }
}

export async function sendBookingRequestToProvider(data: BookingEmailData) {
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, notes, managementToken, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeNotes = notes ? escapeHtml(notes) : null

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking request: ${safeMeetingName} with ${safeClientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">New Booking Request</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">You have a new booking request that needs your approval.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${safeClientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
          </div>
          ${safeNotes ? `
          <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px;"><strong>Notes from client:</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${safeNotes}</p>
          </div>
          ` : ''}
          <p style="margin-bottom: 16px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Review Request</a>
          </p>

          <p style="margin-bottom: 24px;">
            Or <a href="${manageUrl}" style="color: #1a1a1a;">view booking details</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send booking request email to provider:', error)
    return false
  }
}

export async function sendBookingApprovalToClient(data: BookingEmailData) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, meetingLink, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeMeetingLink = meetingLink ? sanitizeUrl(meetingLink) : null

  const meetingLinkHtml = safeMeetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${safeMeetingLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeMeetingLink)}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking confirmed with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Confirmed!</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Great news! Your booking request has been approved.</p>

          <div style="background: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
          </div>

          ${meetingLinkHtml}

          <p style="margin-bottom: 24px;">
            Need to make changes?
            <a href="${manageUrl}" style="color: #1a1a1a;">Manage your booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send booking approval email to client:', error)
    return false
  }
}

export async function sendBookingDeclinedToClient(data: BookingEmailData & { reason?: string }) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, reason, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeReason = reason ? escapeHtml(reason) : null

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking request declined by ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Request Declined</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Unfortunately, your booking request could not be confirmed at this time.</p>

          <div style="background: #fef2f2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
            ${safeReason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>

          <p style="margin-bottom: 24px;">
            Feel free to request a different time.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send booking declined email to client:', error)
    return false
  }
}

export async function sendCancellationEmailToProvider(data: BookingEmailData & { reason?: string }) {
  const { providerEmail, providerName, clientName, meetingName, startTime, endTime, reason, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeReason = reason ? escapeHtml(reason) : null

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking cancelled: ${safeMeetingName} with ${safeClientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Cancelled</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">A booking has been cancelled.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Client:</strong> ${safeClientName}</p>
            ${safeReason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send cancellation email to provider:', error)
    return false
  }
}

// Provider reschedule notification to client
export async function sendProviderRescheduleNotification(data: BookingEmailData & {
  oldStartTime: Date
  oldEndTime: Date
  reason?: string
  rescheduledByName?: string
}) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, oldStartTime, oldEndTime, reason, rescheduledByName, meetingLink, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedOldDate = formatInTimeZone(oldStartTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedOldTime = `${formatInTimeZone(oldStartTime, timezone, 'h:mm a')} - ${formatInTimeZone(oldEndTime, timezone, 'h:mm a')} (${tzAbbr})`
  const formattedNewDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedNewTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeRescheduledByName = rescheduledByName ? escapeHtml(rescheduledByName) : null
  const safeReason = reason ? escapeHtml(reason) : null
  const safeMeetingLink = meetingLink ? sanitizeUrl(meetingLink) : null

  const rescheduledByText = safeRescheduledByName && safeRescheduledByName !== safeProviderName
    ? ` by ${safeRescheduledByName} on behalf of ${safeProviderName}`
    : ` by ${safeProviderName}`

  const meetingLinkHtml = safeMeetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${safeMeetingLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeMeetingLink)}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking rescheduled with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Rescheduled</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been rescheduled${rescheduledByText}.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; text-decoration: line-through; color: #92400e;"><strong>Previous:</strong> ${formattedOldDate} at ${formattedOldTime}</p>
          </div>

          <div style="background: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Date:</strong> ${formattedNewDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Time:</strong> ${formattedNewTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
            ${safeReason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>

          ${meetingLinkHtml}

          <p style="margin-bottom: 24px;">
            Need to make changes?
            <a href="${manageUrl}" style="color: #1a1a1a;">Manage your booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send reschedule notification to client:', error)
    return false
  }
}

// Conflict override notification
export async function sendConflictOverrideNotification(data: BookingEmailData & {
  conflictingBookingId: string
  conflictingClientName: string
  conflictingClientEmail: string
  overrideByName: string
}) {
  const { providerEmail, providerName, clientName, meetingName, startTime, endTime, conflictingClientName, overrideByName, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeConflictingClientName = escapeHtml(conflictingClientName)
  const safeOverrideByName = escapeHtml(overrideByName)

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking conflict override: ${safeMeetingName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Conflict Override</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">${safeOverrideByName} has created a booking that conflicts with an existing meeting.</p>

          <div style="background: #fef2f2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>New Booking:</strong> ${safeMeetingName} with ${safeClientName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Conflicts with:</strong> Meeting with ${safeConflictingClientName}</p>
          </div>

          <p style="margin-bottom: 24px;">
            Please review your calendar and resolve any scheduling issues.
          </p>

          <p style="margin-bottom: 16px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View in Dashboard</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send conflict override notification:', error)
    return false
  }
}

// Reminder emails
export async function sendReminderEmailToClient(data: BookingEmailData & { hoursUntil: number }) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, hoursUntil, meetingLink, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const timeLabel = hoursUntil === 24 ? 'tomorrow' : 'in 1 hour'

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeMeetingLink = meetingLink ? sanitizeUrl(meetingLink) : null

  const meetingLinkHtml = safeMeetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${safeMeetingLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeMeetingLink)}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Reminder: Your appointment ${timeLabel} with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Appointment Reminder</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">This is a friendly reminder about your upcoming appointment ${timeLabel}.</p>

          <div style="background: #e0f2fe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
          </div>

          ${meetingLinkHtml}

          <p style="margin-bottom: 24px;">
            Need to make changes?
            <a href="${manageUrl}" style="color: #1a1a1a;">Manage your booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send reminder email to client:', error)
    return false
  }
}

export async function sendReminderEmailToProvider(data: BookingEmailData & { hoursUntil: number }) {
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, hoursUntil, managementToken, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const timeLabel = hoursUntil === 24 ? 'tomorrow' : 'in 1 hour'

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Reminder: ${safeMeetingName} with ${safeClientName} ${timeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Appointment Reminder</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">You have an appointment ${timeLabel}.</p>

          <div style="background: #e0f2fe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${safeClientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
          </div>

          <p style="margin-bottom: 16px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View in Dashboard</a>
          </p>

          <p style="margin-bottom: 24px;">
            Need to make changes? <a href="${manageUrl}" style="color: #1a1a1a;">Reschedule or cancel this booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send reminder email to provider:', error)
    return false
  }
}

// Client-initiated reschedule confirmation to client
export async function sendClientRescheduleConfirmation(data: BookingEmailData & {
  oldStartTime: Date
  oldEndTime: Date
}) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, oldStartTime, oldEndTime, meetingLink, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedOldDate = formatInTimeZone(oldStartTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedOldTime = `${formatInTimeZone(oldStartTime, timezone, 'h:mm a')} - ${formatInTimeZone(oldEndTime, timezone, 'h:mm a')} (${tzAbbr})`
  const formattedNewDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedNewTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)
  const safeProviderName = escapeHtml(providerName)
  const safeMeetingLink = meetingLink ? sanitizeUrl(meetingLink) : null

  const meetingLinkHtml = safeMeetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${safeMeetingLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeMeetingLink)}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking rescheduled with ${safeProviderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Rescheduled</h1>

          <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been rescheduled to a new time.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0; text-decoration: line-through; color: #92400e;"><strong>Previous:</strong> ${formattedOldDate} at ${formattedOldTime}</p>
          </div>

          <div style="background: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Date:</strong> ${formattedNewDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Time:</strong> ${formattedNewTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${safeProviderName}</p>
          </div>

          ${meetingLinkHtml}

          <p style="margin-bottom: 24px;">
            Need to make changes?
            <a href="${manageUrl}" style="color: #1a1a1a;">Manage your booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send client reschedule confirmation:', error)
    return false
  }
}

// Reschedule notification to provider/team member
export async function sendRescheduleNotificationToProvider(data: BookingEmailData & {
  oldStartTime: Date
  oldEndTime: Date
  rescheduledBy: 'client' | 'provider'
}) {
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, oldStartTime, oldEndTime, rescheduledBy, managementToken, timezone } = data

  const tzAbbr = getTimezoneAbbr(timezone)
  const formattedOldDate = formatInTimeZone(oldStartTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedOldTime = `${formatInTimeZone(oldStartTime, timezone, 'h:mm a')} - ${formatInTimeZone(oldEndTime, timezone, 'h:mm a')} (${tzAbbr})`
  const formattedNewDate = formatInTimeZone(startTime, timezone, 'EEEE, MMMM d, yyyy')
  const formattedNewTime = `${formatInTimeZone(startTime, timezone, 'h:mm a')} - ${formatInTimeZone(endTime, timezone, 'h:mm a')} (${tzAbbr})`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  // Escape user-controlled values
  const safeProviderName = escapeHtml(providerName || '')
  const safeClientName = escapeHtml(clientName)
  const safeMeetingName = escapeHtml(meetingName)

  const rescheduledByText = rescheduledBy === 'client' ? `${safeClientName} has` : 'This booking has been'

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking rescheduled: ${safeMeetingName} with ${safeClientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Rescheduled</h1>

          <p style="margin-bottom: 24px;">Hi ${escapeHtml(safeProviderName?.split(' ')[0] || 'there')},</p>

          <p style="margin-bottom: 24px;">${rescheduledByText} rescheduled the following booking.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0; text-decoration: line-through; color: #92400e;"><strong>Previous:</strong> ${formattedOldDate} at ${formattedOldTime}</p>
          </div>

          <div style="background: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${safeMeetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Date:</strong> ${formattedNewDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>New Time:</strong> ${formattedNewTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${safeClientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
          </div>

          <p style="margin-bottom: 16px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View in Dashboard</a>
          </p>

          <p style="margin-bottom: 24px;">
            Need to make changes? <a href="${manageUrl}" style="color: #1a1a1a;">Reschedule or cancel this booking</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="font-size: 12px; color: #737373;">
            Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
          </p>
        </body>
        </html>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send reschedule notification to provider:', error)
    return false
  }
}
