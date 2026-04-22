import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageReader, InMemoryStorageWriter } from '../../adapters'

import { extractClaims } from './extractClaims'

describe('extractClaims', () => {
  it.effect('when observation is safe, extracts array of claims', () =>
    Effect.gen(function* () {
      const storage = {
        'obs-1.sanitize.yml': `
            version: 1
            ingestion_id: run-1
            observation_id: obs-1
            kind: sanitized_record
            fetched_at: 0
            sanitized_at: 0
            url: ''
            outcome:
              label: SAFE_PUBLIC
              actions: []
            input:
              raw:
                bucket: 'inmemory'
                object: 'obs-1.bin'
              record:
                bucket: 'inmemory'
                object: 'obs-1.ingestion.yml'
            sanitized_raw:
              bucket: 'inmemory'
              object: 'obs-1.bin'
            source:
              name: 'source-1'
              collection: 'rss'
            content:
              sha256: 88a46ed62d1740a187461f94a3df54e1650afaae2a7fc040fb62eff169415924
              bytes: 4662
            http:
              status: 403
              content_type: text/html; charset=UTF-8
              headers:
                date: Fri, 10 Apr 2026 23:41:14 GMT
                content-type: text/html; charset=UTF-8
            `,
        'obs-1.bin': `
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
      const result = yield* extractClaims({
        extractionId: 'run-1',
        observationId: 'obs-1',
        extractedAt: 0,
        pointer: {
          bucket: 'inmemory',
          object: 'obs-1.sanitize.yml',
        },
      }).pipe(
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage))
      )
      expect(result).toStrictEqual([
        {
          claim: 'Example Article 1',
          extractedAt: 0,
          extractionId: 'rss',
          fetchedAt: 0,
          finalUrl: '',
          id: '8c12da2d9be3237a8dcb5b6ef9d0a97296bf61522118756ff9bbb6ebe536dd15',
          ingestionId: 'run-1',
          link: 'https://www.example.com/article1',
          observationId: 'obs-1',
          publishedAt: null,
          source: {
            collection: 'rss',
            name: 'source-1',
          },
          summary: 'This is the first example article',
          title: 'Example Article 1',
          url: '',
          verdict: null,
        },
      ])
    })
  )
  it.effect('when observation is quarantined, returns an empty array', () =>
    Effect.gen(function* () {
      const storage = {
        'obs-1.sanitize.yml': `
            version: 1
            ingestion_id: run-1
            observation_id: obs-1
            kind: sanitized_record
            fetched_at: 0
            sanitized_at: 0
            url: https://www.test-rss.com/feed
            outcome:
              label: QUARANTINED
              actions:
                - QUARANTINED_UNEXPECTED_CONTENT_TYPE
            input:
              raw:
                bucket: 'inmemory'
                object: 'obs-1.bin'
              record:
                bucket: 'inmemory'
                object: 'obs-1.ingestion.yml'
            sanitized_raw:
              bucket: 'inmemory'
              object: 'obs-1.bin'
            source:
              name: 'source-1'
              collection: 'rss'
            content:
              sha256: 88a46ed62d1740a187461f94a3df54e1650afaae2a7fc040fb62eff169415924
              bytes: 4662
            http:
              status: 403
              content_type: text/html; charset=UTF-8
              headers:
                date: Fri, 10 Apr 2026 23:41:14 GMT
                content-type: text/html; charset=UTF-8
            `,
        'obs-1.bin': `
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
      const result = yield* extractClaims({
        extractionId: 'run-1',
        observationId: 'obs-1',
        extractedAt: 0,
        pointer: {
          bucket: 'inmemory',
          object: 'obs-1.sanitize.yml',
        },
      }).pipe(
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage))
      )
      expect(result).toStrictEqual([])
    })
  )
})
