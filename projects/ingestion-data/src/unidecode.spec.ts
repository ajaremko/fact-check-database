import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { parseUnicode } from './unidecode'

describe('parseUnicode', () => {
  it('decodes UTF-8 strings into US-ASCII strings', () => {
    const decode = pipe(Schema.String, parseUnicode(), Schema.decodeSync)
    expect(decode(`aéà)àçé`)).toBe('aea)ace')
    expect(decode(`’`)).toBe("'")
  })
  it('encodes a UTF-8 string into US-ASCII string', () => {
    const encode = pipe(Schema.String, parseUnicode(), Schema.encodeSync)
    expect(encode(`aéà)àçé`)).toBe('aea)ace')
  })
})
