import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, updateTemplateSchema, templateIdSchema, validateParam } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/templates/[id] - Get a single template
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, templateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: template, error } = await supabase
      .from('meeting_templates')
      .select('*')
      .eq('id', id)
      .eq('provider_id', user.id)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Get template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/templates/[id]', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/templates/[id] - Update a template
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, templateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, updateTemplateSchema)
    if (validationError) return validationError

    const { data: template, error } = await supabase
      .from('meeting_templates')
      // @ts-ignore - Supabase types not inferring correctly
      .update(body)
      .eq('id', id)
      .eq('provider_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update template error:', error)
      await logApiError(error, '/api/templates/[id]', 'update', { templateId: id })
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Update template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/templates/[id]', 'update')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { error: idError } = validateParam(id, templateIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('meeting_templates')
      .delete()
      .eq('id', id)
      .eq('provider_id', user.id)

    if (error) {
      console.error('Delete template error:', error)
      await logApiError(error, '/api/templates/[id]', 'delete', { templateId: id })
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/templates/[id]', 'delete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
