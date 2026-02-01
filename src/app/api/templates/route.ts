import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, createTemplateSchema } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

// GET /api/templates - List all templates for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error } = await supabase
      .from('meeting_templates')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Get templates error:', error)
      await logApiError(error, '/api/templates', 'get')
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Get templates error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/templates', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/templates - Create a new template
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, createTemplateSchema)
    if (validationError) return validationError

    const { name, description, agenda, pre_meeting_notes, post_meeting_notes } = body

    const { data: template, error } = await supabase
      .from('meeting_templates')
      // @ts-ignore - Supabase types not inferring correctly
      .insert({
        provider_id: user.id,
        name,
        description: description || null,
        agenda: agenda || null,
        pre_meeting_notes: pre_meeting_notes || null,
        post_meeting_notes: post_meeting_notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create template error:', error)
      await logApiError(error, '/api/templates', 'create')
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/templates', 'create')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
