/**
 * User-friendly error messages for API responses
 */

export const ERROR_MESSAGES = {
  // Booking errors
  BOOKING_NOT_FOUND: 'Booking not found. It may have been deleted or the link is invalid.',
  BOOKING_ALREADY_CANCELLED: 'This booking has already been cancelled.',
  BOOKING_ALREADY_COMPLETED: 'This booking has already been completed.',
  BOOKING_NOT_PENDING: 'This booking is no longer pending approval.',
  BOOKING_PAST: 'This booking has already passed and cannot be modified.',
  BOOKING_CONFLICT: 'This time slot is no longer available. Please select a different time.',

  // Authentication errors
  UNAUTHORIZED: 'Please log in to continue.',
  INVALID_TOKEN: 'This link is invalid or has expired. Please request a new one.',

  // Validation errors
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_DATE: 'Please select a valid date.',
  INVALID_TIME: 'Please select a valid time slot.',
  REQUIRED_FIELD: 'Please fill in all required fields.',

  // Rate limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',

  // Server errors
  SERVER_ERROR: 'Something went wrong on our end. Please try again in a few moments.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',

  // Provider errors
  PROVIDER_NOT_FOUND: 'Provider not found. The booking page may have been moved or deleted.',
  NO_SERVICES_AVAILABLE: 'No services are currently available for booking.',
  NO_AVAILABILITY: 'No available time slots. Please try a different date.',

  // Calendar errors
  CALENDAR_SYNC_FAILED: 'Calendar sync failed. Your booking is confirmed but may not appear in your calendar.',

  // Email errors
  EMAIL_SEND_FAILED: 'We couldn\'t send the confirmation email. Your booking is confirmed.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

/**
 * Get a user-friendly error message for a given error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code]
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(code: ErrorCode, details?: string) {
  return {
    error: ERROR_MESSAGES[code],
    code,
    details,
  }
}
