import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { parseYaml } from './yaml'

describe('parseYaml', () => {
  it('decodes YAML into a typed object', () => {
    const decode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseYaml(),
      Schema.decodeSync
    )
    const result = decode(`
      name: example
      count: 42
    `)
    expect(result).toStrictEqual({ name: 'example', count: 42 })
  })

  it('decodes JSON into a typed object', () => {
    const decode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseYaml(),
      Schema.decodeSync
    )
    const result = decode('{ "name": "example", "count": 42 }')
    expect(result).toStrictEqual({ name: 'example', count: 42 })
  })

  it('encodes a typed object into YAML', () => {
    const encode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseYaml(),
      Schema.encodeSync
    )
    const result = encode({ name: 'example', count: 42 })
    expect(result).toStrictEqual('name: example\ncount: 42\n')
  })

  it('returns an error when decoding invalid YAML', () => {
    const decode = pipe(
      Schema.Struct({
        name: Schema.String,
        count: Schema.Number,
      }),
      parseYaml(),
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
      parseYaml(),
      Schema.encodeUnknownSync
    )
    const result = () => encode({ name: 'example', count: 'not-a-number' })
    expect(result).toThrow()
  })
})
