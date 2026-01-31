import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, updatePoolSchema, poolIdSchema, validateParam } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/pools/[id] - Get a single pool
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, poolIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    type PoolWithMembers = {
      id: string
      name: string
      description: string | null
      pool_type: string
      is_active: boolean
      created_at: string
      owner_id: string
      resource_pool_members: Array<{
        id: string
        provider_id: string
        priority: number
        max_bookings_per_day: number | null
        is_active: boolean
        providers: { id: string; name: string | null; email: string } | null
      }>
    }

    const { data: pool, error } = await supabase
      .from('resource_pools')
      .select(`
        id, name, description, pool_type, is_active, created_at, owner_id,
        resource_pool_members (
          id, provider_id, priority, max_bookings_per_day, is_active,
          providers:provider_id (id, name, email)
        )
      `)
      .eq('id', id)
      .single() as { data: PoolWithMembers | null; error: Error | null }

    if (error || !pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    // Check if user has access (owner or member)
    const isMember = pool.resource_pool_members?.some(
      (m: { provider_id: string }) => m.provider_id === user.id
    )

    if (pool.owner_id !== user.id && !isMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    return NextResponse.json({ pool })
  } catch (error) {
    console.error('Get pool error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/pools/[id] - Update a pool
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, poolIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, updatePoolSchema)
    if (validationError) return validationError

    // Update only if user is the owner
    const { data: pool, error } = await supabase
      .from('resource_pools')
      // @ts-ignore - Supabase types not inferring correctly
      .update(body)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update pool error:', error)
      await logApiError(error, '/api/pools/[id]', 'update', { poolId: id })
      return NextResponse.json({ error: 'Failed to update pool' }, { status: 500 })
    }

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ pool })
  } catch (error) {
    console.error('Update pool error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]', 'update')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/pools/[id] - Delete a pool
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, poolIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete only if user is the owner
    const { error } = await supabase
      .from('resource_pools')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Delete pool error:', error)
      await logApiError(error, '/api/pools/[id]', 'delete', { poolId: id })
      return NextResponse.json({ error: 'Failed to delete pool' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete pool error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools/[id]', 'delete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
