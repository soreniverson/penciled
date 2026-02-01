import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { parseBody, createDelegateSchema } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'
import type { Delegate } from '@/types/database'

// GET /api/delegates - List all delegates for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get delegates (people I've delegated to)
    const { data: delegates, error } = await supabase
      .from('delegates')
      .select(`
        id, permissions, expires_at, created_at,
        delegate:delegate_id (id, name, email)
      `)
      .eq('principal_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Get delegates error:', error)
      await logApiError(error, '/api/delegates', 'get')
      return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 })
    }

    // Also get principals (people who've delegated to me)
    const { data: principals } = await supabase
      .from('delegates')
      .select(`
        id, permissions, expires_at, created_at,
        principal:principal_id (id, name, email)
      `)
      .eq('delegate_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    return NextResponse.json({
      delegates: delegates || [],
      principals: principals || [],
    })
  } catch (error) {
    console.error('Get delegates error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/delegates', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/delegates - Create a new delegate
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, createDelegateSchema)
    if (validationError) return validationError

    const { delegate_email, permissions, expires_at } = body

    // Use admin client to look up the delegate by email
    const adminClient = createAdminClient()
    const { data: delegateProvider } = await adminClient
      .from('providers')
      .select('id')
      .eq('email', delegate_email)
      .single() as { data: { id: string } | null }

    if (!delegateProvider) {
      return NextResponse.json(
        { error: 'User not found. They must have a penciled.fyi account first.' },
        { status: 404 }
      )
    }

    // Prevent self-delegation
    if (delegateProvider.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delegate to yourself' },
        { status: 400 }
      )
    }

    // Check if delegation already exists
    const { data: existing } = await supabase
      .from('delegates')
      .select('id')
      .eq('principal_id', user.id)
      .eq('delegate_id', delegateProvider.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Delegate relationship already exists' },
        { status: 409 }
      )
    }

    // Create the delegation
    const delegateData = {
      principal_id: user.id,
      delegate_id: delegateProvider.id,
      permissions: permissions || {
        view: true,
        book: false,
        reschedule: false,
        cancel: false,
        override_availability: false,
        override_conflicts: false,
      },
      expires_at: expires_at || null,
    }

    const { data: delegate, error } = await supabase
      .from('delegates')
      // @ts-ignore - Supabase types not inferring correctly
      .insert(delegateData)
      .select(`
        id, permissions, expires_at, created_at,
        delegate:delegate_id (id, name, email)
      `)
      .single() as { data: Delegate | null; error: Error | null }

    if (error) {
      console.error('Create delegate error:', error)
      await logApiError(error, '/api/delegates', 'create')
      return NextResponse.json({ error: 'Failed to create delegate' }, { status: 500 })
    }

    return NextResponse.json({ delegate }, { status: 201 })
  } catch (error) {
    console.error('Create delegate error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/delegates', 'create')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
