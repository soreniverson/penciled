import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Missing "to" query parameter' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM_EMAIL = process.env.EMAIL_FROM || 'penciled.fyi <noreply@penciled.fyi>'

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: 'Test email from Penciled.fyi',
      html: `
        <h1>Test Email</h1>
        <p>If you received this, email is working!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    })

    return NextResponse.json({
      success: true,
      result,
      config: {
        from: FROM_EMAIL,
        to: to,
        apiKeyPrefix: process.env.RESEND_API_KEY?.slice(0, 10) + '...',
      }
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      config: {
        from: FROM_EMAIL,
        to: to,
        apiKeyPrefix: process.env.RESEND_API_KEY?.slice(0, 10) + '...',
      }
    }, { status: 500 })
  }
}
