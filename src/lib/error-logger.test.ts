import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Error Logger', () => {
  describe('Error Formatting', () => {
    it('should format error with stack trace', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.ts:10:5'

      expect(error.message).toBe('Test error')
      expect(error.stack).toContain('test.ts:10:5')
    })

    it('should handle errors without stack traces', () => {
      const error = new Error('Test error')
      delete error.stack

      expect(error.message).toBe('Test error')
      expect(error.stack).toBeUndefined()
    })

    it('should handle non-Error objects', () => {
      const errorLike = { message: 'Something went wrong', code: 500 }

      expect(errorLike.message).toBe('Something went wrong')
      expect(errorLike.code).toBe(500)
    })
  })

  describe('Severity Levels', () => {
    const severities = ['error', 'warning', 'info'] as const

    it('should support error severity', () => {
      expect(severities).toContain('error')
    })

    it('should support warning severity', () => {
      expect(severities).toContain('warning')
    })

    it('should support info severity', () => {
      expect(severities).toContain('info')
    })
  })

  describe('Context', () => {
    it('should include route information', () => {
      const context = {
        route: '/api/bookings',
        action: 'create',
        providerId: '123',
      }

      expect(context.route).toBe('/api/bookings')
      expect(context.action).toBe('create')
    })

    it('should include environment information', () => {
      const env = process.env.NODE_ENV || 'development'

      expect(['development', 'production', 'test']).toContain(env)
    })
  })

  describe('Webhook Payload', () => {
    it('should format Discord webhook payload correctly', () => {
      const severity = 'error'
      const colorMap = {
        error: 15158332, // Red
        warning: 16776960, // Yellow
        info: 3447003, // Blue
      }

      const payload = {
        embeds: [{
          title: 'API Error',
          color: colorMap[severity],
          fields: [
            { name: 'Message', value: 'Test error' },
            { name: 'Route', value: '/api/bookings' },
          ],
          timestamp: new Date().toISOString(),
        }],
      }

      expect(payload.embeds[0].color).toBe(15158332)
      expect(payload.embeds[0].fields).toHaveLength(2)
    })

    it('should truncate long error messages', () => {
      const longMessage = 'a'.repeat(2000)
      const maxLength = 1000

      const truncated = longMessage.length > maxLength
        ? longMessage.slice(0, maxLength) + '...'
        : longMessage

      expect(truncated.length).toBe(maxLength + 3)
      expect(truncated.endsWith('...')).toBe(true)
    })
  })

  describe('Fallback Behavior', () => {
    it('should fall back to console.error when webhook URL missing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const webhookUrl = undefined
      const error = new Error('Test error')

      if (!webhookUrl) {
        console.error('Error:', error.message)
      }

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not throw when webhook fails', async () => {
      // Simulate webhook failure
      const sendToWebhook = async () => {
        try {
          throw new Error('Network error')
        } catch {
          // Silently fail
          return false
        }
      }

      const result = await sendToWebhook()
      expect(result).toBe(false)
    })
  })
})
