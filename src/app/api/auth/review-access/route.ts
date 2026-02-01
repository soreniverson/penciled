import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const REVIEW_TOKENS: Record<string, { email: string; name: string }> = {
  'zoom-review-2026': {
    email: 'zoom-reviewer@penciled.fyi',
    name: 'Zoom Reviewer',
  },
}

export async function POST(request: Request) {
  const { token } = await request.json()

  const reviewConfig = REVIEW_TOKENS[token]
  if (!reviewConfig) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const { email, name } = reviewConfig
  const adminClient = createAdminClient()
  const supabase = await createClient()

  // Check if user exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  let user = existingUsers?.users?.find(u => u.email === email)

  if (!user) {
    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    user = newUser.user
  }

  // Create provider record if needed
  const { data: existingProvider } = await adminClient
    .from('providers')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProvider) {
    await (adminClient.from('providers') as ReturnType<typeof adminClient.from>).insert({
      id: user.id,
      email: user.email!,
      name,
      business_name: 'Zoom Review Test',
      slug: 'zoom-reviewer',
      timezone: 'America/Los_Angeles',
    })

    // Create a default meeting for testing
    await (adminClient.from('meetings') as ReturnType<typeof adminClient.from>).insert({
      provider_id: user.id,
      name: 'Test Meeting',
      duration_minutes: 30,
      is_active: true,
    })

    // Create default availability
    const days = [1, 2, 3, 4, 5] // Mon-Fri
    await (adminClient.from('availability') as ReturnType<typeof adminClient.from>).insert(
      days.map(day => ({
        provider_id: user!.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      }))
    )
  }

  // Generate a magic link to create a session
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    return NextResponse.json({ error: linkError?.message || 'Failed to generate link' }, { status: 500 })
  }

  // Extract the token from the link and verify it to create a session
  const url = new URL(linkData.properties.action_link)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink',
    })

    if (verifyError) {
      return NextResponse.json({ error: verifyError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    redirectTo: '/dashboard/settings/integrations'
  })
}
