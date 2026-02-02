import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { stopCalendarWatch } from '@/lib/google-calendar'
import { logApiError } from '@/lib/error-logger'

// GDPR Account Deletion Endpoint
// Allows authenticated users to delete their account and all associated data

export async function DELETE(request: Request) {
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

    // Optional: require confirmation in request body
    let body: { confirm?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // No body is fine
    }

    // Require explicit confirmation
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'Please confirm deletion by setting confirm: true in request body' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Stop calendar watch first (if connected)
    try {
      await stopCalendarWatch(user.id)
    } catch (err) {
      console.error('Error stopping calendar watch:', err)
      // Continue with deletion even if this fails
    }

    // Delete in order to respect foreign key constraints
    // Most tables cascade from providers, but let's be explicit

    // 1. Delete booking calendar events
    await adminSupabase
      .from('booking_calendar_events')
      .delete()
      .eq('provider_id', user.id)

    // 2. Delete booking assignments
    await adminSupabase
      .from('booking_assignments')
      .delete()
      .eq('provider_id', user.id)

    // 3. Delete follow-ups for provider's bookings
    await adminSupabase
      .from('follow_ups')
      .delete()
      .eq('provider_id', user.id)

    // 4. Delete follow-up templates
    await adminSupabase
      .from('follow_up_templates')
      .delete()
      .eq('provider_id', user.id)

    // 5. Delete meeting templates
    await adminSupabase
      .from('meeting_templates')
      .delete()
      .eq('provider_id', user.id)

    // 6. Delete resource pool memberships
    await adminSupabase
      .from('resource_pool_members')
      .delete()
      .eq('provider_id', user.id)

    // 7. Delete resource pools owned by user
    await adminSupabase
      .from('resource_pools')
      .delete()
      .eq('owner_id', user.id)

    // 8. Delete booking link memberships
    await adminSupabase
      .from('booking_link_members')
      .delete()
      .eq('provider_id', user.id)

    // 9. Delete booking links owned by user
    await adminSupabase
      .from('booking_links')
      .delete()
      .eq('owner_id', user.id)

    // 10. Delete delegate relationships (both as principal and delegate)
    await adminSupabase
      .from('delegates')
      .delete()
      .or(`principal_id.eq.${user.id},delegate_id.eq.${user.id}`)

    // 11. Delete calendar watches
    await adminSupabase
      .from('calendar_watches')
      .delete()
      .eq('provider_id', user.id)

    // 12. Delete blackout dates
    await adminSupabase
      .from('blackout_dates')
      .delete()
      .eq('provider_id', user.id)

    // 13. Delete bookings (will cascade to related records)
    await adminSupabase
      .from('bookings')
      .delete()
      .eq('provider_id', user.id)

    // 14. Delete availability
    await adminSupabase
      .from('availability')
      .delete()
      .eq('provider_id', user.id)

    // 15. Delete meetings
    await adminSupabase
      .from('meetings')
      .delete()
      .eq('provider_id', user.id)

    // 16. Delete provider record (this should cascade, but being explicit)
    const { error: providerError } = await adminSupabase
      .from('providers')
      .delete()
      .eq('id', user.id)

    if (providerError) {
      console.error('Error deleting provider:', providerError)
      await logApiError(providerError, '/api/user/delete', 'delete_provider')
      return NextResponse.json(
        { error: 'Failed to delete account data' },
        { status: 500 }
      )
    }

    // 17. Finally, delete the auth user
    const { error: userError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (userError) {
      console.error('Error deleting auth user:', userError)
      await logApiError(userError, '/api/user/delete', 'delete_auth_user')
      // Data is already deleted, so return partial success
      return NextResponse.json(
        {
          success: true,
          warning: 'Account data deleted, but auth record may remain. Please contact support.'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    await logApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/user/delete',
      'delete'
    )
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
