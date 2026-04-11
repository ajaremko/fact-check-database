import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryArchive } from '../adapters'

import { extractRowsFromSanitized } from './extractRowsFromSanitized'

describe('extractRowsFromSanitized', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const archive = {
          'test-sanitized-record.yml': `
          version: 1
          runId: 'run-1'
          kind: sanitized_record
          fetchedAt: 0
          sanitizedAt: 0
          url: ''
          input:
            raw:
              bucket: 'test-bucket'
              object: 'raw.bin'
            record:
              bucket: 'test-bucket'
              object: 'test-ingestion-record.yml'
          sanitizedRaw:
            bucket: 'test-bucket'
            object: 'sanitized.bin'
          source:
            name: 'source-1'
            collection: 'rss'
          content:
            sha256: 88a46ed62d1740a187461f94a3df54e1650afaae2a7fc040fb62eff169415924
            bytes: 4662
          http:
            status: 403
            contentType: text/html; charset=UTF-8
            headers:
              date: Fri, 10 Apr 2026 23:41:14 GMT
              content-type: text/html; charset=UTF-8
          policy:
            label: QUARANTINED
            actions:
              - QUARANTINED_UNEXPECTED_CONTENT_TYPE
          `,
          'sanitized.bin': `
          <rss version="2.0">
            <channel>
              <title>Example RSS Feed</title>
              <link>https://www.example.com/</link>
              <description>This is an example RSS feed</description>
              <item>
                <title>Example Article 1</title>
                <link>https://www.example.com/article1</link>
                <description>This is the first example article</description>
              </item>
              </channel>
          </rss>`,
        }
        const result = yield* extractRowsFromSanitized({
          observationId: 'run-1',
          pointer: {
            bucket: 'inmemory',
            object: 'test-sanitized-record.yml',
          },
        }).pipe(Effect.provide(InMemoryArchive.layer(archive)))

        expect(result).toStrictEqual([])
      })
  )
})
