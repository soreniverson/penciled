import { escapeHtml, sanitizeUrl } from './helpers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Wrap email content in the standard HTML template
 */
export function wrapInEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      ${content}
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
      <p style="font-size: 12px; color: #737373;">
        Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
      </p>
    </body>
    </html>
  `
}

/**
 * Email title/heading block
 */
export function emailTitle(title: string): string {
  return `<h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">${escapeHtml(title)}</h1>`
}

/**
 * Email greeting
 */
export function emailGreeting(name: string): string {
  return `<p style="margin-bottom: 24px;">Hi ${escapeHtml(name)},</p>`
}

/**
 * Email paragraph
 */
export function emailParagraph(text: string): string {
  return `<p style="margin-bottom: 24px;">${text}</p>`
}

/**
 * Booking details box
 */
export function bookingDetailsBox(details: {
  meetingName: string
  date: string
  time: string
  provider?: string
  client?: string
  clientEmail?: string
}): string {
  let html = `
    <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${escapeHtml(details.meetingName)}</p>
      <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${details.date}</p>
      <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${details.time}</p>
  `

  if (details.provider) {
    html += `<p style="margin: 0;"><strong>Provider:</strong> ${escapeHtml(details.provider)}</p>`
  }

  if (details.client) {
    html += `<p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${escapeHtml(details.client)}</p>`
  }

  if (details.clientEmail) {
    html += `<p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(details.clientEmail)}</p>`
  }

  html += '</div>'
  return html
}

/**
 * Video call join link box
 */
export function videoLinkBox(meetingLink: string | null | undefined): string {
  if (!meetingLink) return ''

  const safeLink = sanitizeUrl(meetingLink)
  if (safeLink === '#') return ''

  return `
    <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
      <a href="${safeLink}" style="color: #1d4ed8; word-break: break-all;">${escapeHtml(safeLink)}</a>
    </div>
  `
}

/**
 * Notes box (yellow background)
 */
export function notesBox(notes: string | null | undefined, label = 'Notes from client:'): string {
  if (!notes) return ''

  return `
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>${escapeHtml(label)}</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">${escapeHtml(notes)}</p>
    </div>
  `
}

/**
 * Primary action button
 */
export function primaryButton(text: string, url: string): string {
  return `
    <p style="margin-bottom: 16px;">
      <a href="${sanitizeUrl(url)}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">${escapeHtml(text)}</a>
    </p>
  `
}

/**
 * Secondary link
 */
export function secondaryLink(text: string, linkText: string, url: string): string {
  return `
    <p style="margin-bottom: 24px;">
      ${escapeHtml(text)} <a href="${sanitizeUrl(url)}" style="color: #1a1a1a;">${escapeHtml(linkText)}</a>
    </p>
  `
}

/**
 * Approval/Decline action buttons
 */
export function approvalButtons(approveUrl: string, declineUrl: string): string {
  return `
    <div style="margin-bottom: 24px;">
      <a href="${sanitizeUrl(approveUrl)}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-right: 12px;">Approve</a>
      <a href="${sanitizeUrl(declineUrl)}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Decline</a>
    </div>
  `
}

/**
 * Time comparison box (for reschedules)
 */
export function timeComparisonBox(oldDate: string, oldTime: string, newDate: string, newTime: string): string {
  return `
    <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373; text-transform: uppercase;">Original Time</p>
        <p style="margin: 0; text-decoration: line-through; color: #737373;">${oldDate}</p>
        <p style="margin: 0; text-decoration: line-through; color: #737373;">${oldTime}</p>
      </div>
      <div>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #16a34a; text-transform: uppercase;">New Time</p>
        <p style="margin: 0; font-weight: 600;">${newDate}</p>
        <p style="margin: 0; font-weight: 600;">${newTime}</p>
      </div>
    </div>
  `
}
