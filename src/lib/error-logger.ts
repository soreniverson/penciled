type ErrorSeverity = 'error' | 'warning' | 'info'

type ErrorContext = {
  route?: string
  action?: string
  userId?: string
  bookingId?: string
  [key: string]: unknown
}

type LogErrorOptions = {
  error: Error | string
  severity?: ErrorSeverity
  context?: ErrorContext
}

const SEVERITY_COLORS = {
  error: 0xff0000,    // Red
  warning: 0xffcc00,  // Yellow
  info: 0x0099ff,     // Blue
}

/**
 * Log an error to the configured webhook (Discord/Slack compatible)
 * Silently fails if webhook URL is not configured or request fails
 */
export async function logError({
  error,
  severity = 'error',
  context = {},
}: LogErrorOptions): Promise<void> {
  const webhookUrl = process.env.ERROR_WEBHOOK_URL

  if (!webhookUrl) {
    // No webhook configured, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}]`, error, context)
    }
    return
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  const environment = process.env.NODE_ENV || 'development'
  const timestamp = new Date().toISOString()

  // Build context fields
  const contextFields = Object.entries(context)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: String(value),
      inline: true,
    }))

  // Discord embed format (also works with many webhook services)
  const payload = {
    embeds: [
      {
        title: `${severity.toUpperCase()}: ${errorMessage.slice(0, 200)}`,
        color: SEVERITY_COLORS[severity],
        fields: [
          { name: 'Environment', value: environment, inline: true },
          { name: 'Timestamp', value: timestamp, inline: true },
          ...contextFields,
        ],
        ...(errorStack && {
          description: `\`\`\`\n${errorStack.slice(0, 2000)}\n\`\`\``,
        }),
        footer: {
          text: 'penciled.fyi Error Logger',
        },
      },
    ],
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silently fail - don't crash the app if webhook fails
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to send error to webhook:', error)
    }
  }
}

/**
 * Convenience function for logging errors in API routes
 */
export function logApiError(
  error: Error | string,
  route: string,
  action?: string,
  additionalContext?: ErrorContext
): Promise<void> {
  return logError({
    error,
    severity: 'error',
    context: {
      route,
      action,
      ...additionalContext,
    },
  })
}

/**
 * Convenience function for logging warnings
 */
export function logWarning(
  message: string,
  context?: ErrorContext
): Promise<void> {
  return logError({
    error: message,
    severity: 'warning',
    context,
  })
}

/**
 * Convenience function for logging info
 */
export function logInfo(
  message: string,
  context?: ErrorContext
): Promise<void> {
  return logError({
    error: message,
    severity: 'info',
    context,
  })
}

/**
 * Log a silent failure - when an operation fails but we continue anyway
 * (e.g., email sending fails but booking was created)
 */
export function logSilentFailure(
  operation: string,
  error: Error | string,
  context?: ErrorContext
): Promise<void> {
  return logError({
    error: `Silent failure in ${operation}: ${error instanceof Error ? error.message : error}`,
    severity: 'warning',
    context: {
      ...context,
      silent_failure: true,
      operation,
    },
  })
}

/**
 * Wrapper to execute an operation and log if it fails silently
 * Returns null on failure instead of throwing
 */
export async function withSilentFailureLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    await logSilentFailure(
      operation,
      error instanceof Error ? error : new Error(String(error)),
      context
    )
    return null
  }
}
