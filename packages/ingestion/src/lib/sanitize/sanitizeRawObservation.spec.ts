import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { DataFetchedRecordSchema, NoResponseRecordSchema } from '../data'
import { InMemoryStorageReader, InMemoryStorageWriter } from '../adapters'

import { sanitizeRawObservation } from './sanitizeRawObservation'
import { SanitizationAttempted } from './SanitizationAttempted'

describe('sanitizeRawObservation', () => {
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
          runId: ''
          fetchedAt: 0
          url: ''
          source:
            name: ''
            collection: ''
          `,
        }

        const result = yield* sanitizeRawObservation({
          id: 'obs-1',
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
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual([])
      })
  )

  it.effect(
    'writes sanitizer record and returns SanitizationAttempted event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'test-record.yml': JSON.stringify(
            DataFetchedRecordSchema.make({
              version: 1,
              kind: 'fetch_attempt',
              outcome: 'data_fetched',
              runId: '',
              fetchedAt: 0,
              url: '',
              source: { name: '', collection: '' },
              http: { status: 200, headers: {}, contentType: 'text/xml' },
              content: { sha256: '', bytes: 0 },
              pointer: { bucket: '', object: '' },
            })
          ),
        }

        const result = yield* sanitizeRawObservation({
          id: 'obs-1',
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
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual([
          new SanitizationAttempted({
            content: {
              bytes: 0,
              sha256: '',
            },
            error: undefined,
            fetchedAt: 0,
            finalUrl: '',
            http: {
              contentType: 'text/xml',
              status: 200,
            },
            observationId: 'obs-1',
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=/date=1970-01-01/run=/obs-1.sanitizer.yml',
            },
            runId: '',
            source: {
              collection: '',
              name: '',
            },
            url: '',
          }),
        ])
      })
  )
})
