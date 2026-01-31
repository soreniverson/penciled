import { NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'

export * from './booking'
export * from './delegate'
export * from './pool'
export * from './template'
export * from './follow-up'

/**
 * Parse and validate request body with Zod schema
 * Returns validated data or NextResponse with error
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data }
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return {
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }
    if (err instanceof SyntaxError) {
      return {
        error: NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        ),
      }
    }
    return {
      error: NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate a single value with Zod schema
 * Returns validated data or NextResponse with error
 */
export function validateParam<T>(
  value: unknown,
  schema: ZodSchema<T>
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  try {
    const data = schema.parse(value)
    return { data }
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: NextResponse.json(
          { error: err.errors[0]?.message || 'Validation failed' },
          { status: 400 }
        ),
      }
    }
    return {
      error: NextResponse.json(
        { error: 'Invalid parameter' },
        { status: 400 }
      ),
    }
  }
}
