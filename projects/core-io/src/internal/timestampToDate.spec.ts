import { describe, it, expect } from '@effect/vitest'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

import { timestampToDate } from './timestampToDate'

describe('timestampToDate', () => {
  it('combines numeric seconds with nanos', () => {
    const result = timestampToDate({ seconds: 1790253296, nanos: 789_000_000 })
    expect(result).toStrictEqual(new Date('2026-09-24T12:34:56.789Z'))
  })

  it('accepts string seconds', () => {
    const result = timestampToDate({
      seconds: '1790253296',
      nanos: 789_000_000,
    })
    expect(result).toStrictEqual(new Date('2026-09-24T12:34:56.789Z'))
  })

  it('accepts Long-like seconds', () => {
    const result = timestampToDate({
      seconds: {
        toString: () => '1790253296',
      } as unknown as google.protobuf.ITimestamp['seconds'],
      nanos: 789_000_000,
    })
    expect(result).toStrictEqual(new Date('2026-09-24T12:34:56.789Z'))
  })

  it('treats missing nanos as zero', () => {
    const result = timestampToDate({ seconds: 1790253296 })
    expect(result.getTime()).toBe(1790253296 * 1000)
  })

  it('treats missing fields as the epoch', () => {
    expect(timestampToDate({}).getTime()).toBe(0)
  })
})
