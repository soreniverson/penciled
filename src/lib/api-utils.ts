import { NextResponse } from 'next/server'
import { logApiError } from '@/lib/error-logger'
import { ZodSchema, ZodError } from 'zod'

/**
 * Standard API response type
 */
export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Create a standardized success response
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Create a standardized error response
 */
export function error(message: string, status = 500, details?: unknown): NextResponse {
  const response: { error: string; details?: unknown } = { error: message }
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details
  }
  return NextResponse.json(response, { status })
}

/**
 * Common error responses
 */
export const errors = {
  badRequest: (message = 'Bad request') => error(message, 400),
  unauthorized: (message = 'Unauthorized') => error(message, 401),
  forbidden: (message = 'Forbidden') => error(message, 403),
  notFound: (message = 'Not found') => error(message, 404),
  rateLimited: (message = 'Too many requests') => error(message, 429),
  internal: (message = 'Internal server error') => error(message, 500),
}

/**
 * Route context type for dynamic routes
 */
export type RouteContext<T extends Record<string, string> = Record<string, string>> = {
  params: Promise<T>
}

/**
 * Handler function type
 */
type Handler<T extends Record<string, string> = Record<string, string>> = (
  request: Request,
  context: RouteContext<T>
) => Promise<NextResponse>

/**
 * Wraps an API handler with standardized error handling
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler(async (req, { params }) => {
 *   const { id } = await params
 *   // Your logic here - just handle the happy path
 *   // Errors will be caught and logged automatically
 *   return success({ id })
 * }, '/api/example')
 * ```
 */
export function apiHandler<T extends Record<string, string> = Record<string, string>>(
  handler: Handler<T>,
  routePath: string
): Handler<T> {
  return async (request: Request, context: RouteContext<T>) => {
    try {
      return await handler(request, context)
    } catch (err) {
      // Log the error
      const errorObj = err instanceof Error ? err : new Error(String(err))
      await logApiError(errorObj, routePath, request.method)

      // Return appropriate error response
      if (err instanceof ZodError) {
        return error('Validation error', 400, err.errors)
      }

      console.error(`API Error [${routePath}]:`, err)
      return errors.internal()
    }
  }
}

/**
 * Parse and validate request body with a Zod schema
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Parse and validate query params
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

/**
 * Assert a condition, throwing an error if false
 */
export function assert(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) {
    throw new ApiError(message, status)
  }
}

/**
 * Custom API error class that includes status code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
