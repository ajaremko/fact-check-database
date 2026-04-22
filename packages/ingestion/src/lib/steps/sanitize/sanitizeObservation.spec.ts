import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageReader, InMemoryStorageWriter } from '../../adapters'

import { sanitizeObservation } from './sanitizeObservation'
import { ObservationSanitized } from './ObservationSanitized'

describe('sanitizeObservation', () => {
  it.effect(
    'skips non-data_fetched records and returns empty array without writing',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'test-record.yml': `
          version: 1
          kind: fetch_attempt
          outcome: no_response
          error: Network error
          observation_id: 'obs-1'
          ingestion_id: 'run-1'
          fetched_at: 0
          url: 'https://test-rss.com/rss'
          source:
            name: 'test'
            collection: 'rss'
          `,
        }

        const result = yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: [],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
              },
            ],
          },
          pointer: {
            bucket: 'test-bucket',
            object: 'test-record.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationSanitized({
            observationId: 'obs-1',
            ingestionId: 'run-1',
            fetchedAt: 0,
            url: 'https://test-rss.com/rss',
            error: 'Network error',
            source: {
              collection: 'rss',
              name: 'test',
            },
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=test/date=1970-01-01/ingestion_id=run-1/obs-1.sanitize.yml',
            },
          })
        )
      })
  )

  it.effect(
    'writes sanitizer record and returns SanitizationAttempted event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'test-record.yml': `
          version: 1
          kind: fetch_attempt
          outcome: data_fetched
          observation_id: 'obs-1'
          ingestion_id: 'run-1'
          fetched_at: 0
          url: 'https://test-rss.com/rss'
          source: 
            name: 'test'
            collection: 'rss'
          http: 
            status: 200
            headers: {} 
            content_type: 'text/xml'
          content:
            sha256: abc
            bytes: 256
          pointer:
            bucket: test-bucket
            object: test-record.yml
          `,
        }

        const result = yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: [],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
              },
            ],
          },
          pointer: {
            bucket: 'test-bucket',
            object: 'test-record.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationSanitized({
            content: {
              bytes: 256,
              sha256: 'abc',
            },
            fetchedAt: 0,
            http: {
              contentType: 'text/xml',
              status: 200,
            },
            observationId: 'obs-1',
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=test/date=1970-01-01/ingestion_id=run-1/obs-1.sanitize.yml',
            },
            ingestionId: 'run-1',
            source: {
              collection: 'rss',
              name: 'test',
            },
            url: 'https://test-rss.com/rss',
          })
        )
      })
  )
})
