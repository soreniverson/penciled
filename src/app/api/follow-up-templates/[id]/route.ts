import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, updateFollowUpTemplateSchema, followUpTemplateIdSchema, validateParam } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

// PATCH /api/follow-up-templates/[id] - Update a follow-up template
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, followUpTemplateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, updateFollowUpTemplateSchema)
    if (validationError) return validationError

    const { data: template, error } = await supabase
      .from('follow_up_templates')
      // @ts-ignore - Supabase types not inferring correctly
      .update(body)
      .eq('id', id)
      .eq('provider_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update follow-up template error:', error)
      await logApiError(error, '/api/follow-up-templates/[id]', 'update', { templateId: id })
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Update follow-up template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/follow-up-templates/[id]', 'update')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/follow-up-templates/[id] - Delete a follow-up template
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, followUpTemplateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('follow_up_templates')
      .delete()
      .eq('id', id)
      .eq('provider_id', user.id)

    if (error) {
      console.error('Delete follow-up template error:', error)
      await logApiError(error, '/api/follow-up-templates/[id]', 'delete', { templateId: id })
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete follow-up template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/follow-up-templates/[id]', 'delete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
