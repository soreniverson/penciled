import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DEV ONLY: Create/login a test user without OAuth
// This endpoint only works in development mode
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

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
      user_metadata: { full_name: 'Test User' },
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
    await (adminClient.from('providers') as any).insert({
      id: user.id,
      email: user.email!,
      name: 'Test User',
    })
  }

  // Generate a magic link (this creates a session)
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

  // Check if onboarding is complete
  const { data: meetings } = await adminClient
    .from('meetings')
    .select('id')
    .eq('provider_id', user.id)
    .limit(1)

  const redirectTo = meetings && meetings.length > 0 ? '/dashboard' : '/onboarding'

  return NextResponse.json({ success: true, redirectTo })
}
