import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseBody, createFollowUpTemplateSchema } from '@/lib/validations'
import { logApiError } from '@/lib/error-logger'

// GET /api/follow-up-templates - List all follow-up templates
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error } = await supabase
      .from('follow_up_templates')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get follow-up templates error:', error)
      await logApiError(error, '/api/follow-up-templates', 'get')
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Get follow-up templates error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/follow-up-templates', 'get')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/follow-up-templates - Create a new follow-up template
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, error: validationError } = await parseBody(request, createFollowUpTemplateSchema)
    if (validationError) return validationError

    const { name, type, delay_minutes, subject, content, apply_to_meetings } = body

    const { data: template, error } = await supabase
      .from('follow_up_templates')
      // @ts-ignore - Supabase types not inferring correctly
      .insert({
        provider_id: user.id,
        name,
        type,
        delay_minutes,
        subject: subject || null,
        content,
        apply_to_meetings: apply_to_meetings || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create follow-up template error:', error)
      await logApiError(error, '/api/follow-up-templates', 'create')
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Create follow-up template error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/follow-up-templates', 'create')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
