import { describe, it, expect } from 'vitest'
import { escapeHtml, sanitizeUrl, getTimezoneAbbr, formatEmailDate, formatEmailTimeRange } from './helpers'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("It's fine")).toBe('It&#039;s fine')
  })

  it('handles empty strings', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('preserves normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('sanitizeUrl', () => {
  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path?query=1')).toBe('https://example.com/path?query=1')
  })

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#')
  })

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
  })

  it('handles invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('#')
  })

  it('handles empty strings', () => {
    expect(sanitizeUrl('')).toBe('#')
  })
})

describe('getTimezoneAbbr', () => {
  it('returns timezone abbreviation for valid timezone', () => {
    const abbr = getTimezoneAbbr('America/New_York')
    // Should be EST or EDT depending on time of year
    expect(['EST', 'EDT']).toContain(abbr)
  })

  it('returns original timezone for invalid timezone', () => {
    expect(getTimezoneAbbr('Invalid/Timezone')).toBe('Invalid/Timezone')
  })

  it('handles UTC', () => {
    expect(getTimezoneAbbr('UTC')).toBe('UTC')
  })
})

describe('formatEmailDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-03-15T10:00:00Z')
    const result = formatEmailDate(date, 'America/New_York')
    // Should be Friday, March 15, 2024
    expect(result).toContain('March')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})

describe('formatEmailTimeRange', () => {
  it('formats time range with timezone abbreviation', () => {
    const start = new Date('2024-03-15T14:00:00Z')
    const end = new Date('2024-03-15T15:00:00Z')
    const result = formatEmailTimeRange(start, end, 'America/New_York')
    // Should include time and timezone
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
    expect(result).toContain('-')
    expect(result).toMatch(/(EST|EDT)/i)
  })
})
