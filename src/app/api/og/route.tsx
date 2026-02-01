import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const name = searchParams.get('name') || 'penciled.fyi'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: '#a1a1aa',
              marginBottom: 24,
              letterSpacing: '-0.02em',
            }}
          >
            Book an appointment with
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#fafafa',
              marginBottom: 40,
              letterSpacing: '-0.03em',
              maxWidth: '900px',
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: '#71717a',
              }}
            >
              Powered by
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#a1a1aa',
              }}
            >
              penciled.fyi
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
