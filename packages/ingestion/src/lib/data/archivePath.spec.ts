import { describe, it, expect } from 'vitest'

import { ymd, archiveBaseDir } from './archivePath'

describe('ymd', () => {
  it('formats unix epoch as 1970-01-01', () => {
    expect(ymd(0)).toBe('1970-01-01')
  })

  it('formats a known midday UTC timestamp to the correct date', () => {
    // 2025-04-08T12:00:00.000Z — midday UTC, stable across all UTC offsets
    expect(ymd(1744113600000)).toBe('2025-04-08')
  })

  it('formats the last millisecond of a day', () => {
    // 2024-12-31T12:00:00.000Z (midday UTC, unambiguously Dec 31)
    expect(ymd(1735646400000)).toBe('2024-12-31')
  })
})

describe('archiveBaseDir', () => {
  it('constructs the correct partition segment for epoch', () => {
    expect(archiveBaseDir('source-1', 0, 'run-abc')).toBe(
      'source=source-1/date=1970-01-01/run=run-abc'
    )
  })

  it('embeds the formatted date from fetchedAt', () => {
    // 2025-04-08T12:00:00.000Z
    expect(archiveBaseDir('my-feed', 1744113600000, 'run-xyz')).toBe(
      'source=my-feed/date=2025-04-08/run=run-xyz'
    )
  })

  it('preserves the sourceName and runId verbatim', () => {
    const result = archiveBaseDir('example.com', 0, 'run-00000')
    expect(result).toContain('source=example.com')
    expect(result).toContain('run=run-00000')
  })
})
