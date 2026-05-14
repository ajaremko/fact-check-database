import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { parseBufferEncoded } from './Node'

describe('parseBufferEncoded', () => {
  it('decodes a base64 encoded string into a utf string', () => {
    const decode = pipe(
      Schema.String,
      parseBufferEncoded({ decode: 'utf-8', encode: 'base64' }),
      Schema.decodeSync
    )
    const result = decode('Zm9v')
    expect(result).toStrictEqual('foo')
  })

  it('encodes a utf string into a base64 encoded string', () => {
    const encode = pipe(
      Schema.String,
      parseBufferEncoded({ decode: 'utf-8', encode: 'base64' }),
      Schema.encodeSync
    )
    const result = encode('foo')
    expect(result).toStrictEqual('Zm9v')
  })
})
