import { describe, it } from 'vitest'
import { Schema } from 'effect'
import { expect } from '@effect/vitest'

import { Timestamp } from '@fact-check-database/ingestion-contracts/shared/v1'

import { FetchedBodyPathSchema } from './FetchedBody'

describe('FetchedBodyPathSchema', () => {
  it('encodes to a raw archive path', () => {
    expect(
      Schema.encodeSync(FetchedBodyPathSchema)({
        contentSha256: 'abc123',
        ingestorRunId: 'run-1',
        fetchedAt: 0 as Timestamp,
        sourceId: 'politifact',
        body: new Uint8Array(),
        contentType: 'application/rss+xml; charset=utf-8',
      })
    ).toBe(
      'v1/raw/source=politifact/date=1970-01-01/ingestor_run_id=run-1/abc123.bin'
    )
  })
})
