import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { parseXml } from './Xml'

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

  it('decodes attributes using the default prefix', () => {
    const decode = pipe(
      Schema.Struct({
        item: Schema.Struct({
          '@_id': Schema.String,
          name: Schema.String,
        }),
      }),
      parseXml(),
      Schema.decodeUnknownSync
    )
    expect(decode('<item id="7"><name>x</name></item>')).toStrictEqual({
      item: { '@_id': '7', name: 'x' },
    })
  })

  it('encodes prefixed keys back into attributes', () => {
    const encode = pipe(
      Schema.Struct({
        item: Schema.Struct({
          '@_id': Schema.String,
          name: Schema.String,
        }),
      }),
      parseXml(),
      Schema.encodeSync
    )
    expect(encode({ item: { '@_id': '7', name: 'x' } })).toStrictEqual(
      '<item id="7"><name>x</name></item>'
    )
  })
})
