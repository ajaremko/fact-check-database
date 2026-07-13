import { describe, it, expect } from 'vitest'

import { extractVerdict } from './verdict'

describe('extractVerdict', () => {
  it('returns null for null or undefined input', () => {
    expect(extractVerdict(null)).toBeNull()
    expect(extractVerdict(undefined)).toBeNull()
    expect(extractVerdict('')).toBeNull()
  })

  it('returns null when no pattern matches', () => {
    expect(extractVerdict('This claim was verified accurate.')).toBeNull()
  })

  it('matches "false" case-insensitively', () => {
    expect(extractVerdict('Rated FALSE by our fact-checkers')).toBe('false')
  })

  it('matches "misleading"', () => {
    expect(extractVerdict('This is misleading')).toBe('misleading')
  })

  it('matches "no evidence" as unsupported', () => {
    expect(extractVerdict('There is no evidence for this claim')).toBe(
      'unsupported'
    )
  })

  it('matches "exaggerated"', () => {
    expect(extractVerdict('The claim is exaggerated')).toBe('exaggerated')
  })

  it('has no pattern that produces "true", even for text containing "true"', () => {
    expect(extractVerdict('This statement is true')).toBeNull()
  })

  it('returns the first matching pattern when multiple could apply', () => {
    expect(extractVerdict('False and misleading')).toBe('false')
  })
})
