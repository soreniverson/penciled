/**
 * Retry utility for external service calls
 * Implements exponential backoff with jitter
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
}

/**
 * Check if an error is retryable (network errors, rate limits, server errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false

  // Check for common retryable error patterns
  const errorMessage = error instanceof Error ? error.message : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnreset') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('socket hang up')
  ) {
    return true
  }

  // Check HTTP status codes from fetch responses
  if (error && typeof error === 'object') {
    const status = (error as { status?: number }).status
    if (status) {
      // Retry on rate limit (429) and server errors (500-599)
      if (status === 429 || (status >= 500 && status < 600)) {
        return true
      }
      // Don't retry on client errors (except rate limit)
      if (status >= 400 && status < 500) {
        return false
      }
    }
  }

  return true // Default to retryable for unknown errors
}

/**
 * Sleep for a specified duration with jitter
 */
function sleep(ms: number): Promise<void> {
  // Add jitter: +/- 25% of delay
  const jitter = ms * 0.25 * (Math.random() * 2 - 1)
  return new Promise((resolve) => setTimeout(resolve, ms + jitter))
}

/**
 * Execute a function with retry logic
 *
 * @example
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, shouldRetry: isRetryableError }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if this error type shouldn't be retried
      if (!opts.shouldRetry(error)) {
        throw error
      }

      // Don't wait after the last attempt
      if (attempt === opts.maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      )

      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : String(error)
      )

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Wrap a fetch call with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options)

      // Throw for status codes that should trigger retry
      if (response.status === 429 || response.status >= 500) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number }
        error.status = response.status
        throw error
      }

      return response
    },
    {
      shouldRetry: isRetryableError,
      ...retryOptions,
    }
  )
}
