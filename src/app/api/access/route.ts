import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Check if email is in allowlist
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('allowed_emails')
    .select('id')
    .eq('email', email)
    .single()

  return NextResponse.json({ allowed: !!data })
}

// Request access (add to waitlist)
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = email?.toLowerCase().trim()

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if already on allowlist
    const { data: allowed } = await supabase
      .from('allowed_emails')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (allowed) {
      return NextResponse.json({ error: 'Already approved', allowed: true }, { status: 400 })
    }

    // Check if already requested
    const { data: existing } = await supabase
      .from('waitlist_requests')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, alreadyRequested: true })
    }

    // Add to waitlist
    const { error } = await supabase
      .from('waitlist_requests')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ email: normalizedEmail } as any)

    if (error) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist request error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
