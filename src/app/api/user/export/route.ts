import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GDPR Data Export Endpoint
// Allows authenticated users to download all their personal data

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch provider data
    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user.id)
      .single() as { data: { id: string; name: string | null; business_name: string | null; email: string; slug: string; timezone: string; accent_color: string | null; created_at: string; updated_at: string } | null }

    if (!provider) {
      return NextResponse.json(
        { error: 'No provider profile found' },
        { status: 404 }
      )
    }

    // Fetch all related data
    const [meetingsResult, availabilityResult, bookingsResult] = await Promise.all([
      supabase
        .from('meetings')
        .select('*')
        .eq('provider_id', provider.id) as unknown as Promise<{ data: Record<string, unknown>[] | null }>,
      supabase
        .from('availability')
        .select('*')
        .eq('provider_id', provider.id) as unknown as Promise<{ data: Record<string, unknown>[] | null }>,
      supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', provider.id) as unknown as Promise<{ data: Array<{ client_email: string | null; management_token: string; [key: string]: unknown }> | null }>,
    ])

    // Compile all user data
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      provider: {
        id: provider.id,
        name: provider.name,
        business_name: provider.business_name,
        email: provider.email,
        slug: provider.slug,
        timezone: provider.timezone,
        accent_color: provider.accent_color,
        created_at: provider.created_at,
        updated_at: provider.updated_at,
        // Note: google_calendar_tokens are excluded for security
      },
      meetings: meetingsResult.data || [],
      availability: availabilityResult.data || [],
      bookings: (bookingsResult.data || []).map(booking => {
        // Remove sensitive fields from export
        const { management_token, google_event_id, zoom_meeting_id, ...safeBooking } = booking
        return {
          ...safeBooking,
          // Mask sensitive client data partially
          client_email: booking.client_email ?
            booking.client_email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
        }
      }),
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="penciled-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
