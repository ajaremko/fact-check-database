import { describe, it, expect } from '@effect/vitest'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

import { timestampToDate } from './timestampToDate'

const expected = new Date('2026-09-24T12:34:56.789Z')
const seconds = Math.floor(expected.getTime() / 1000)
const nanos = 789_000_000

describe('timestampToDate', () => {
  it('combines numeric seconds with nanos', () => {
    expect(timestampToDate({ seconds, nanos })).toStrictEqual(expected)
  })

  it('accepts string seconds', () => {
    expect(timestampToDate({ seconds: String(seconds), nanos })).toStrictEqual(
      expected
    )
  })

  it('accepts Long-like seconds', () => {
    // Stand-in for a protobufjs Long, which stringifies to its decimal value
    const long = {
      toString: () => String(seconds),
    } as unknown as google.protobuf.ITimestamp['seconds']
    expect(timestampToDate({ seconds: long, nanos })).toStrictEqual(expected)
  })

  it('treats missing nanos as zero', () => {
    expect(timestampToDate({ seconds }).getTime()).toBe(seconds * 1000)
  })

  it('treats missing fields as the epoch', () => {
    expect(timestampToDate({}).getTime()).toBe(0)
  })
})
