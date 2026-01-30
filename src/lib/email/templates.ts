/**
 * Email Template System
 *
 * Reusable components for building consistent email templates
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Base HTML wrapper for all emails
 */
export function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      ${content}
      ${footer()}
    </body>
    </html>
  `
}

/**
 * Email header/title
 */
export function header(title: string): string {
  return `<h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">${title}</h1>`
}

/**
 * Greeting paragraph
 */
export function greeting(name: string): string {
  const firstName = name?.split(' ')[0] || 'there'
  return `<p style="margin-bottom: 24px;">Hi ${firstName},</p>`
}

/**
 * Regular paragraph
 */
export function paragraph(text: string): string {
  return `<p style="margin-bottom: 24px;">${text}</p>`
}

/**
 * Booking details card
 */
export function bookingDetails(data: {
  meetingName: string
  formattedDate: string
  formattedTime: string
  providerName?: string
  clientName?: string
  clientEmail?: string
}): string {
  const lines: string[] = [
    `<p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${data.meetingName}</p>`,
    `<p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${data.formattedDate}</p>`,
    `<p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${data.formattedTime}</p>`,
  ]

  if (data.providerName) {
    lines.push(`<p style="margin: 0;"><strong>Provider:</strong> ${data.providerName}</p>`)
  }

  if (data.clientName) {
    lines.push(`<p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${data.clientName}</p>`)
  }

  if (data.clientEmail) {
    lines.push(`<p style="margin: 0;"><strong>Email:</strong> ${data.clientEmail}</p>`)
  }

  return `
    <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      ${lines.join('\n')}
    </div>
  `
}

/**
 * Notes/message card (warning-style)
 */
export function notesCard(label: string, content: string): string {
  return `
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>${label}</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">${content}</p>
    </div>
  `
}

/**
 * Info card (neutral style)
 */
export function infoCard(label: string, content: string): string {
  return `
    <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>${label}</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">${content}</p>
    </div>
  `
}

/**
 * Primary CTA button
 */
export function primaryButton(url: string, text: string): string {
  return `
    <p style="margin-bottom: 16px;">
      <a href="${url}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">${text}</a>
    </p>
  `
}

/**
 * Inline link
 */
export function link(url: string, text: string): string {
  return `<a href="${url}" style="color: #1a1a1a;">${text}</a>`
}

/**
 * Text link paragraph
 */
export function textWithLink(text: string, url: string, linkText: string): string {
  return `<p style="margin-bottom: 24px;">${text} ${link(url, linkText)}</p>`
}

/**
 * Footer
 */
export function footer(): string {
  return `
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
    <p style="font-size: 12px; color: #737373;">
      Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
    </p>
  `
}

/**
 * Divider
 */
export function divider(): string {
  return `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">`
}
