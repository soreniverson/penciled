import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'complete')
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    // Validate booking ID
    const { error: idError } = validateParam(id, bookingIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update booking status to completed
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('provider_id', user.id)

    if (error) {
      console.error('Complete error:', error)
      await logApiError(error, '/api/bookings/[id]/complete', 'complete', { bookingId: id })
      return NextResponse.json({ error: 'Failed to complete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Complete error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/complete', 'complete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
