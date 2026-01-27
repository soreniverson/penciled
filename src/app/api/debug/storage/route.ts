import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Temporary debug endpoint - DELETE AFTER DEBUGGING
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    const adminClient = createAdminClient()

    // List all buckets
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

    return NextResponse.json({
      supabaseUrl,
      hasServiceKey,
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
      listError: listError?.message || null,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
