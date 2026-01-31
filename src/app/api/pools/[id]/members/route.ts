import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { parseBody, addPoolMemberSchema, updatePoolMemberSchema, poolIdSchema, memberIdSchema, validateParam } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/pools/[id]/members - Add a member to the pool
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: poolId } = await params

    const { error: idError } = validateParam(poolId, poolIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this pool
    const { data: pool } = await supabase
      .from('resource_pools')
      .select('id')
      .eq('id', poolId)
      .eq('owner_id', user.id)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found or not authorized' }, { status: 404 })
    }

    const { data: body, error: validationError } = await parseBody(request, addPoolMemberSchema)
    if (validationError) return validationError

    const { provider_email, priority, max_bookings_per_day } = body

    // Look up provider by email
    const adminClient = createAdminClient()
    const { data: provider } = await adminClient
      .from('providers')
      .select('id')
      .eq('email', provider_email)
      .single() as { data: { id: string } | null }

    if (!provider) {
      return NextResponse.json(
        { error: 'User not found. They must have a penciled.fyi account first.' },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('resource_pool_members')
      .select('id')
      .eq('pool_id', poolId)
      .eq('provider_id', provider.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a member of this pool' },
        { status: 409 }
      )
    }

    // Add member
    const { data: member, error } = await supabase
      .from('resource_pool_members')
      // @ts-ignore - Supabase types not inferring correctly
      .insert({
        pool_id: poolId,
        provider_id: provider.id,
        priority: priority || 0,
        max_bookings_per_day: max_bookings_per_day || null,
      })
      .select(`
        id, provider_id, priority, max_bookings_per_day, is_active,
        providers:provider_id (id, name, email)
      `)
      .single()

    if (error) {
      console.error('Add pool member error:', error)
      await logApiError(error, '/api/pools/[id]/members', 'add', { poolId })
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Add pool member error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]/members', 'add')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/pools/[id]/members?member_id=xxx - Update a member
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: poolId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')

    const { error: poolIdError } = validateParam(poolId, poolIdSchema)
    if (poolIdError) return poolIdError

    if (!memberId) {
      return NextResponse.json({ error: 'Missing member_id parameter' }, { status: 400 })
    }

    const { error: memberIdError } = validateParam(memberId, memberIdSchema)
    if (memberIdError) return memberIdError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this pool
    const { data: pool } = await supabase
      .from('resource_pools')
      .select('id')
      .eq('id', poolId)
      .eq('owner_id', user.id)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found or not authorized' }, { status: 404 })
    }

    const { data: body, error: validationError } = await parseBody(request, updatePoolMemberSchema)
    if (validationError) return validationError

    const { data: member, error } = await supabase
      .from('resource_pool_members')
      // @ts-ignore - Supabase types not inferring correctly
      .update(body)
      .eq('id', memberId)
      .eq('pool_id', poolId)
      .select(`
        id, provider_id, priority, max_bookings_per_day, is_active,
        providers:provider_id (id, name, email)
      `)
      .single()

    if (error) {
      console.error('Update pool member error:', error)
      await logApiError(error, '/api/pools/[id]/members', 'update', { poolId, memberId })
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Update pool member error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]/members', 'update')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/pools/[id]/members?member_id=xxx - Remove a member
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id: poolId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')

    const { error: poolIdError } = validateParam(poolId, poolIdSchema)
    if (poolIdError) return poolIdError

    if (!memberId) {
      return NextResponse.json({ error: 'Missing member_id parameter' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this pool
    const { data: pool } = await supabase
      .from('resource_pools')
      .select('id')
      .eq('id', poolId)
      .eq('owner_id', user.id)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found or not authorized' }, { status: 404 })
    }

    const { error } = await supabase
      .from('resource_pool_members')
      .delete()
      .eq('id', memberId)
      .eq('pool_id', poolId)

    if (error) {
      console.error('Delete pool member error:', error)
      await logApiError(error, '/api/pools/[id]/members', 'delete', { poolId, memberId })
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete pool member error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]/members', 'delete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
