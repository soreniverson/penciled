import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, updateDelegateSchema, delegateIdSchema, validateParam } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

// PATCH /api/delegates/[id] - Update a delegate's permissions
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    // Validate delegate ID
    const { error: idError } = validateParam(id, delegateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, updateDelegateSchema)
    if (validationError) return validationError

    // Only update the delegate if the current user is the principal
    const updateData: Record<string, unknown> = {}
    if (body.permissions) {
      updateData.permissions = body.permissions
    }
    if (body.expires_at !== undefined) {
      updateData.expires_at = body.expires_at
    }

    const { data: delegate, error } = await supabase
      .from('delegates')
      // @ts-ignore - Supabase types not inferring correctly
      .update(updateData)
      .eq('id', id)
      .eq('principal_id', user.id) // Ensure user owns this delegation
      .select(`
        id, permissions, expires_at, created_at,
        delegate:delegate_id (id, name, email)
      `)
      .single()

    if (error) {
      console.error('Update delegate error:', error)
      await logApiError(error, '/api/delegates/[id]', 'update', { delegateId: id })
      return NextResponse.json({ error: 'Failed to update delegate' }, { status: 500 })
    }

    if (!delegate) {
      return NextResponse.json({ error: 'Delegate not found' }, { status: 404 })
    }

    return NextResponse.json({ delegate })
  } catch (error) {
    console.error('Update delegate error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/delegates/[id]', 'update')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/delegates/[id] - Remove a delegate
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    // Validate delegate ID
    const { error: idError } = validateParam(id, delegateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the delegate - user can delete if they're the principal OR the delegate
    const { error } = await supabase
      .from('delegates')
      .delete()
      .eq('id', id)
      .or(`principal_id.eq.${user.id},delegate_id.eq.${user.id}`)

    if (error) {
      console.error('Delete delegate error:', error)
      await logApiError(error, '/api/delegates/[id]', 'delete', { delegateId: id })
      return NextResponse.json({ error: 'Failed to delete delegate' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete delegate error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/delegates/[id]', 'delete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
