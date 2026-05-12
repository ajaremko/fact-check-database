import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { parseXml } from './xml'

describe('parseXml', () => {
  it('decodes XML into a typed object', () => {
    const decode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseXml(),
      Schema.decodeSync
    )
    const result = decode(`
      <name>example</name>
      <count>42</count>
    `)
    expect(result).toStrictEqual({ name: 'example', count: 42 })
  })

  it('encodes a typed object into XML', () => {
    const encode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseXml(),
      Schema.encodeSync
    )
    const result = encode({ name: 'example', count: 42 })
    expect(result).toStrictEqual('<name>example</name><count>42</count>')
  })

  it('returns an error when decoding invalid XML', () => {
    const decode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseXml(),
      Schema.decodeSync
    )
    const result = () =>
      decode(`
      <name>example</name>
      <count>not-a-number</count>
    `)
    expect(result).toThrow()
  })

  it('returns an error when encoding an invalid object', () => {
    const encode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseXml(),
      Schema.encodeUnknownSync
    )
    const result = () => encode({ name: 'example', count: 'not-a-number' })
    expect(result).toThrow()
  })
})
