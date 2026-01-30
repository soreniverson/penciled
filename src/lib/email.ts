import { Resend } from 'resend'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

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
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, meetingLink } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const meetingLinkHtml = meetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${meetingLink}" style="color: #1d4ed8; word-break: break-all;">${meetingLink}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking confirmed with ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Confirmed</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been confirmed.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
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
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, notes, managementToken } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `New booking: ${meetingName} with ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">New Booking</h1>

          <p style="margin-bottom: 24px;">Hi ${providerName?.split(' ')[0] || 'there'},</p>

          <p style="margin-bottom: 24px;">You have a new booking!</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${clientEmail}</p>
          </div>
          ${notes ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px;"><strong>Notes from client:</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${notes}</p>
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
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, reason } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking cancelled with ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Cancelled</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">Your appointment has been cancelled.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
            ${reason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
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
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking request sent to ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Request Sent</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">Your booking request has been sent to ${providerName}. You'll receive an email once they confirm.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Status:</strong> Pending confirmation</p>
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
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
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, notes, managementToken } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking request: ${meetingName} with ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">New Booking Request</h1>

          <p style="margin-bottom: 24px;">Hi ${providerName?.split(' ')[0] || 'there'},</p>

          <p style="margin-bottom: 24px;">You have a new booking request that needs your approval.</p>

          <div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${clientEmail}</p>
          </div>
          ${notes ? `
          <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px;"><strong>Notes from client:</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${notes}</p>
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
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, meetingLink } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const meetingLinkHtml = meetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${meetingLink}" style="color: #1d4ed8; word-break: break-all;">${meetingLink}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking confirmed with ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Confirmed!</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">Great news! Your booking request has been approved.</p>

          <div style="background: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
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
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, reason } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Booking request declined by ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Request Declined</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">Unfortunately, your booking request could not be confirmed at this time.</p>

          <div style="background: #fef2f2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
            ${reason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
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
  const { providerEmail, providerName, clientName, meetingName, startTime, endTime, reason } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Booking cancelled: ${meetingName} with ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Booking Cancelled</h1>

          <p style="margin-bottom: 24px;">Hi ${providerName?.split(' ')[0] || 'there'},</p>

          <p style="margin-bottom: 24px;">A booking has been cancelled.</p>

          <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Client:</strong> ${clientName}</p>
            ${reason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
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

// Reminder emails
export async function sendReminderEmailToClient(data: BookingEmailData & { hoursUntil: number }) {
  const { clientEmail, clientName, meetingName, providerName, startTime, endTime, managementToken, hoursUntil, meetingLink } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const timeLabel = hoursUntil === 24 ? 'tomorrow' : 'in 1 hour'

  const meetingLinkHtml = meetingLink ? `
          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Join Video Call</p>
            <a href="${meetingLink}" style="color: #1d4ed8; word-break: break-all;">${meetingLink}</a>
          </div>
  ` : ''

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `Reminder: Your appointment ${timeLabel} with ${providerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Appointment Reminder</h1>

          <p style="margin-bottom: 24px;">Hi ${clientName},</p>

          <p style="margin-bottom: 24px;">This is a friendly reminder about your upcoming appointment ${timeLabel}.</p>

          <div style="background: #e0f2fe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
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
  const { providerEmail, providerName, clientName, clientEmail, meetingName, startTime, endTime, hoursUntil, managementToken } = data

  const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy')
  const formattedTime = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const dashboardUrl = `${APP_URL}/dashboard/bookings`
  const manageUrl = `${APP_URL}/booking/${data.bookingId}/manage?token=${managementToken}`

  const timeLabel = hoursUntil === 24 ? 'tomorrow' : 'in 1 hour'

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: providerEmail,
      subject: `Reminder: ${meetingName} with ${clientName} ${timeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Appointment Reminder</h1>

          <p style="margin-bottom: 24px;">Hi ${providerName?.split(' ')[0] || 'there'},</p>

          <p style="margin-bottom: 24px;">You have an appointment ${timeLabel}.</p>

          <div style="background: #e0f2fe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meetingName}</p>
            <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 0 0 12px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${clientEmail}</p>
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
