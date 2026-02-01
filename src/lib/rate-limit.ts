import { NextResponse } from 'next/server'

type RateLimitConfig = {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

type RateLimitEntry = {
  count: number
  resetTime: number
}

// In-memory store (for development and single-instance deployments)
const memoryStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime <= now) {
      memoryStore.delete(key)
    }
  }
}

// Rate limit configurations
export const RATE_LIMITS = {
  booking: { windowMs: 60000, maxRequests: 5 },      // 5 bookings per minute
  cancel: { windowMs: 60000, maxRequests: 10 },      // 10 cancellations per minute
  reschedule: { windowMs: 60000, maxRequests: 5 },   // 5 reschedules per minute
  approve: { windowMs: 60000, maxRequests: 20 },     // 20 approvals per minute
  decline: { windowMs: 60000, maxRequests: 20 },     // 20 declines per minute
  complete: { windowMs: 60000, maxRequests: 20 },    // 20 completions per minute
  slots: { windowMs: 60000, maxRequests: 30 },       // 30 slot queries per minute (public endpoint)
} as const

export type RateLimitAction = keyof typeof RATE_LIMITS

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `ua:${userAgent.slice(0, 50)}`
}

/**
 * Check rate limit using Upstash Redis if available, otherwise fallback to memory
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return checkRateLimitMemory(key, config)
  }

  const now = Date.now()
  const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`

  try {
    // Increment counter in Redis
    const response = await fetch(`${redisUrl}/incr/${windowKey}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })
    const data = await response.json()
    const count = data.result as number

    // Set expiry on first request in window
    if (count === 1) {
      await fetch(`${redisUrl}/expire/${windowKey}/${Math.ceil(config.windowMs / 1000)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      })
    }

    const resetTime = (Math.floor(now / config.windowMs) + 1) * config.windowMs
    return {
      limited: count > config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
    }
  } catch (error) {
    console.error('Redis rate limit error, falling back to memory:', error)
    return checkRateLimitMemory(key, config)
  }
}

/**
 * Check rate limit using in-memory store
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries()

  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || entry.resetTime <= now) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  entry.count++
  return {
    limited: entry.count > config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Check rate limit for a given action
 * Returns null if within limit, or NextResponse with 429 if exceeded
 */
export async function checkRateLimit(
  request: Request,
  action: RateLimitAction
): Promise<NextResponse | null> {
  const config = RATE_LIMITS[action]
  const clientId = getClientId(request)
  const key = `${action}:${clientId}`

  const { limited, remaining, resetTime } = await checkRateLimitRedis(key, config)

  if (limited) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        },
      }
    )
  }

  return null
}

/**
 * Rate limit middleware for API routes (sync wrapper for backward compatibility)
 */
export function withRateLimit(
  request: Request,
  action: RateLimitAction,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return checkRateLimit(request, action).then(rateLimitResponse => {
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler()
  })
}
