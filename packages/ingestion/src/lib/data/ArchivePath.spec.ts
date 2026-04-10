import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'

import { ArchivePathSchema } from './ArchivePath'

describe('ArchivePath', () => {
  it('can encode observation and file details into an archive path', () => {
    expect(
      Schema.encodeSync(ArchivePathSchema)({
        version: 1,
        collectionName: 'test_collection',
        ext: 'sanitizer.yml',
        sourceName: 'https://test-rss.com/rss',
        date: 1704067200000,
        runId: 'abc123',
        id: 'record_id',
      })
    ).toBe(
      'v1/test_collection/source=https://test-rss.com/rss/date=2024-01-01/run=abc123/record_id.sanitizer.yml'
    )
  })
})
