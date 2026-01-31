import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, createPoolSchema } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

// GET /api/pools - List all pools for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pools owned by user and pools user is a member of
    const [{ data: ownedPools }, { data: memberPools }] = await Promise.all([
      supabase
        .from('resource_pools')
        .select(`
          id, name, description, pool_type, is_active, created_at,
          resource_pool_members (
            id, provider_id, priority, is_active,
            providers:provider_id (id, name, email)
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('resource_pool_members')
        .select(`
          pool_id,
          resource_pools:pool_id (
            id, name, description, pool_type, is_active, created_at,
            owner:owner_id (id, name, email)
          )
        `)
        .eq('provider_id', user.id),
    ])

    return NextResponse.json({
      owned: ownedPools || [],
      memberOf: memberPools?.map(m => m.resource_pools).filter(Boolean) || [],
    })
  } catch (error) {
    console.error('Get pools error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/pools - Create a new resource pool
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, createPoolSchema)
    if (validationError) return validationError

    const { name, description, pool_type } = body

    const { data: pool, error } = await supabase
      .from('resource_pools')
      // @ts-ignore - Supabase types not inferring correctly
      .insert({
        owner_id: user.id,
        name,
        description: description || null,
        pool_type,
      })
      .select()
      .single()

    if (error) {
      console.error('Create pool error:', error)
      await logApiError(error, '/api/pools', 'create')
      return NextResponse.json({ error: 'Failed to create pool' }, { status: 500 })
    }

    return NextResponse.json({ pool }, { status: 201 })
  } catch (error) {
    console.error('Create pool error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/pools', 'create')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
