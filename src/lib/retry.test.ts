import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isRetryableError, fetchWithRetry } from './retry'

describe('isRetryableError', () => {
  it('returns true for network errors', () => {
    expect(isRetryableError(new Error('network error'))).toBe(true)
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
    expect(isRetryableError(new Error('timeout'))).toBe(true)
    expect(isRetryableError(new Error('socket hang up'))).toBe(true)
  })

  it('returns true for server errors (5xx)', () => {
    const error500 = { status: 500, message: 'Internal Server Error' }
    const error503 = { status: 503, message: 'Service Unavailable' }
    expect(isRetryableError(error500)).toBe(true)
    expect(isRetryableError(error503)).toBe(true)
  })

  it('returns true for rate limit errors (429)', () => {
    const error429 = { status: 429, message: 'Too Many Requests' }
    expect(isRetryableError(error429)).toBe(true)
  })

  it('returns false for client errors (4xx except 429)', () => {
    const error400 = { status: 400, message: 'Bad Request' }
    const error401 = { status: 401, message: 'Unauthorized' }
    const error404 = { status: 404, message: 'Not Found' }
    expect(isRetryableError(error400)).toBe(false)
    expect(isRetryableError(error401)).toBe(false)
    expect(isRetryableError(error404)).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn, { maxAttempts: 3 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const promise = withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 100,
    })

    // First call fails immediately
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)

    // Wait for first retry
    await vi.advanceTimersByTimeAsync(150)
    expect(fn).toHaveBeenCalledTimes(2)

    // Wait for second retry
    await vi.advanceTimersByTimeAsync(250)
    expect(fn).toHaveBeenCalledTimes(3)

    const result = await promise
    expect(result).toBe('success')
  })

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const promise = withRetry(fn, {
      maxAttempts: 2,
      initialDelayMs: 100,
    })

    // Attach catch handler immediately to prevent unhandled rejection
    const resultPromise = promise.catch(e => ({ error: e }))

    // Advance past all retries
    await vi.advanceTimersByTimeAsync(500)

    const result = await resultPromise
    expect(result).toHaveProperty('error')
    expect((result as { error: Error }).error.message).toBe('always fails')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400, message: 'Bad Request' })

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        shouldRetry: isRetryableError,
      })
    ).rejects.toEqual({ status: 400, message: 'Bad Request' })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')

    const promise = withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
    })

    // First call happens immediately
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)

    // First retry after ~100ms
    await vi.advanceTimersByTimeAsync(150)
    expect(fn).toHaveBeenCalledTimes(2)

    // Second retry after ~200ms (100 * 2)
    await vi.advanceTimersByTimeAsync(250)
    expect(fn).toHaveBeenCalledTimes(3)

    await promise
  })
})

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns response on success', async () => {
    const mockResponse = { ok: true, status: 200 }
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

    const result = await fetchWithRetry('https://example.com')
    expect(result).toBe(mockResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 500 error', async () => {
    const error500 = { ok: false, status: 500, statusText: 'Internal Server Error' }
    const success = { ok: true, status: 200 }

    vi.mocked(fetch)
      .mockResolvedValueOnce(error500 as Response)
      .mockResolvedValue(success as Response)

    const promise = fetchWithRetry('https://example.com', undefined, {
      initialDelayMs: 100,
    })

    // First call fails
    await vi.advanceTimersByTimeAsync(0)

    // Wait for retry
    await vi.advanceTimersByTimeAsync(150)

    const result = await promise
    expect(result).toBe(success)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 rate limit', async () => {
    const error429 = { ok: false, status: 429, statusText: 'Too Many Requests' }
    const success = { ok: true, status: 200 }

    vi.mocked(fetch)
      .mockResolvedValueOnce(error429 as Response)
      .mockResolvedValue(success as Response)

    const promise = fetchWithRetry('https://example.com', undefined, {
      initialDelayMs: 100,
    })

    await vi.advanceTimersByTimeAsync(150)

    const result = await promise
    expect(result).toBe(success)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
