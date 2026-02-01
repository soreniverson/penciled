import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.EMAIL_FROM || 'penciled.fyi <noreply@penciled.fyi>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Create admin client for cron access
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type FollowUpWithDetails = {
  id: string
  booking_id: string
  type: 'email' | 'feedback_request'
  subject: string | null
  content: { body?: string; questions?: string[] } | null
  bookings: {
    client_name: string
    client_email: string
    start_time: string
    providers: { name: string | null; business_name: string | null; email: string } | null
    meetings: { name: string } | null
  } | null
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // Get pending follow-ups that are due
    const { data: followUps } = await supabase
      .from('follow_ups')
      .select(`
        id, booking_id, type, subject, content,
        bookings:booking_id (
          client_name, client_email, start_time,
          providers:provider_id (name, business_name, email),
          meetings:meeting_id (name)
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(100) // Process in batches

    if (!followUps || followUps.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending follow-ups' })
    }

    const successfulIds: string[] = []
    const failedUpdates: { id: string; error_message: string }[] = []

    for (const followUp of followUps as unknown as FollowUpWithDetails[]) {
      results.processed++

      const booking = followUp.bookings
      if (!booking || !booking.providers || !booking.meetings) {
        failedUpdates.push({ id: followUp.id, error_message: 'Missing booking data' })
        results.failed++
        continue
      }

      const provider = booking.providers
      const meeting = booking.meetings
      const providerName = provider.business_name || provider.name || 'Your provider'

      try {
        if (followUp.type === 'email') {
          // Send follow-up email
          const subject = followUp.subject || `Thank you for your ${meeting.name}`
          const body = (followUp.content?.body) || `
            Thank you for attending your ${meeting.name} with ${providerName}.

            If you have any questions or need to schedule another appointment, please don't hesitate to reach out.

            Best regards,
            ${providerName}
          `

          const formattedDate = format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')

          await resend.emails.send({
            from: FROM_EMAIL,
            to: booking.client_email,
            subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Follow-up: ${meeting.name}</h1>

                <p style="margin-bottom: 24px;">Hi ${booking.client_name},</p>

                <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px 0;"><strong>Meeting:</strong> ${meeting.name}</p>
                  <p style="margin: 0 0 12px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 0;"><strong>With:</strong> ${providerName}</p>
                </div>

                <div style="margin-bottom: 24px; white-space: pre-wrap;">${body}</div>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                <p style="font-size: 12px; color: #737373;">
                  Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
                </p>
              </body>
              </html>
            `,
          })

          successfulIds.push(followUp.id)
          results.sent++
        } else if (followUp.type === 'feedback_request') {
          // Send feedback request email
          const questions = followUp.content?.questions || ['How was your experience?']

          await resend.emails.send({
            from: FROM_EMAIL,
            to: booking.client_email,
            subject: `We'd love your feedback on your ${meeting.name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">We'd Love Your Feedback</h1>

                <p style="margin-bottom: 24px;">Hi ${booking.client_name},</p>

                <p style="margin-bottom: 24px;">Thank you for your recent ${meeting.name} with ${providerName}. We'd love to hear about your experience!</p>

                <div style="background: #f5f5f4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <p style="margin: 0; font-weight: 600;">Questions:</p>
                  <ul style="margin: 12px 0 0 0; padding-left: 20px;">
                    ${questions.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join('')}
                  </ul>
                </div>

                <p style="margin-bottom: 24px;">
                  Simply reply to this email with your feedback. Your input helps us improve!
                </p>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

                <p style="font-size: 12px; color: #737373;">
                  Powered by <a href="${APP_URL}" style="color: #737373;">penciled.fyi</a>
                </p>
              </body>
              </html>
            `,
          })

          successfulIds.push(followUp.id)
          results.sent++
        }
      } catch (err) {
        console.error(`Follow-up ${followUp.id} failed:`, err)
        results.errors.push(`${followUp.id}: ${err}`)
        results.failed++
        failedUpdates.push({
          id: followUp.id,
          error_message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Batch update successful follow-ups
    if (successfulIds.length > 0) {
      await supabase
        .from('follow_ups')
        // @ts-ignore
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', successfulIds)
    }

    // Batch update failed follow-ups
    for (const failed of failedUpdates) {
      await supabase
        .from('follow_ups')
        // @ts-ignore
        .update({ status: 'failed', error_message: failed.error_message })
        .eq('id', failed.id)
    }

    return NextResponse.json({
      success: true,
      results: {
        processed: results.processed,
        sent: results.sent,
        failed: results.failed,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error('Follow-ups cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process follow-ups' },
      { status: 500 }
    )
  }
}
