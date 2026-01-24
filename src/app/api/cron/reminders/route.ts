import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendReminderEmailToClient, sendReminderEmailToProvider } from '@/lib/email'
import { addHours } from 'date-fns'

// This endpoint should be called by a cron job every hour
// e.g., via Vercel Cron or an external service

// Type for booking with joined relations (reminder columns added via migration)
type BookingWithReminder = {
  id: string
  management_token: string
  client_name: string
  client_email: string
  start_time: string
  end_time: string
  reminder_24h_sent: boolean
  reminder_1h_sent: boolean
  providers: { name: string | null; business_name: string | null; email: string; timezone: string } | null
  services: { name: string } | null
}

// Create untyped admin client for accessing columns not yet in type definitions
function createUntypedAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createUntypedAdminClient()
  const now = new Date()

  // Find bookings that need 24-hour reminders
  // (between 23-25 hours from now, to account for cron timing)
  const reminder24hStart = addHours(now, 23)
  const reminder24hEnd = addHours(now, 25)

  // Find bookings that need 1-hour reminders
  // (between 55 minutes and 1 hour 5 minutes from now)
  const reminder1hStart = addHours(now, 55 / 60)
  const reminder1hEnd = addHours(now, 65 / 60)

  const results = {
    reminders24h: 0,
    reminders1h: 0,
    errors: [] as string[],
  }

  try {
    // 24-hour reminders
    const { data: bookings24h } = await supabase
      .from('bookings')
      .select(`
        id, management_token, client_name, client_email, start_time, end_time,
        reminder_24h_sent,
        providers:provider_id (name, business_name, email, timezone),
        services:service_id (name)
      `)
      .eq('status', 'confirmed')
      .eq('reminder_24h_sent', false)
      .gte('start_time', reminder24hStart.toISOString())
      .lte('start_time', reminder24hEnd.toISOString())

    if (bookings24h) {
      for (const booking of bookings24h as unknown as BookingWithReminder[]) {
        const provider = booking.providers
        const service = booking.services

        if (!provider || !service) continue

        const emailData = {
          bookingId: booking.id,
          managementToken: booking.management_token,
          serviceName: service.name,
          providerName: provider.business_name || provider.name || 'Your provider',
          providerEmail: provider.email,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          startTime: new Date(booking.start_time),
          endTime: new Date(booking.end_time),
          timezone: provider.timezone,
          hoursUntil: 24,
        }

        try {
          await Promise.all([
            sendReminderEmailToClient(emailData),
            sendReminderEmailToProvider(emailData),
          ])

          // Mark reminder as sent
          await supabase
            .from('bookings')
            .update({ reminder_24h_sent: true })
            .eq('id', booking.id)

          results.reminders24h++
        } catch (error) {
          results.errors.push(`24h reminder for ${booking.id}: ${error}`)
        }
      }
    }

    // 1-hour reminders
    const { data: bookings1h } = await supabase
      .from('bookings')
      .select(`
        id, management_token, client_name, client_email, start_time, end_time,
        reminder_1h_sent,
        providers:provider_id (name, business_name, email, timezone),
        services:service_id (name)
      `)
      .eq('status', 'confirmed')
      .eq('reminder_1h_sent', false)
      .gte('start_time', reminder1hStart.toISOString())
      .lte('start_time', reminder1hEnd.toISOString())

    if (bookings1h) {
      for (const booking of bookings1h as unknown as BookingWithReminder[]) {
        const provider = booking.providers
        const service = booking.services

        if (!provider || !service) continue

        const emailData = {
          bookingId: booking.id,
          managementToken: booking.management_token,
          serviceName: service.name,
          providerName: provider.business_name || provider.name || 'Your provider',
          providerEmail: provider.email,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          startTime: new Date(booking.start_time),
          endTime: new Date(booking.end_time),
          timezone: provider.timezone,
          hoursUntil: 1,
        }

        try {
          await Promise.all([
            sendReminderEmailToClient(emailData),
            sendReminderEmailToProvider(emailData),
          ])

          // Mark reminder as sent
          await supabase
            .from('bookings')
            .update({ reminder_1h_sent: true })
            .eq('id', booking.id)

          results.reminders1h++
        } catch (error) {
          results.errors.push(`1h reminder for ${booking.id}: ${error}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: {
        reminders24h: results.reminders24h,
        reminders1h: results.reminders1h,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error('Cron reminder error:', error)
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
