import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Layer, Logger } from 'effect'

import { MessageBatch } from '@fact-check-database/core-io'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'
import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'

import { App, JobContext } from './index'

describe('App', () => {
  it.effect(
    'acks a skipped observation and logs the job as completed at info',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const acked: Array<string> = []
        const storage = {
          'quarantined.sanitize.yml': `
          version: 1
          kind: sanitized_record
          ingestor_run_id: run-0
          fetched_at: 0
          sanitized_at: 0
          source:
            id: africacheck
            name: africacheck.org
            url: https://africacheck.org/feed
            collection: rss
          input:
            record:
              bucket: local
              object: record.yml
          label: QUARANTINED
          actions:
            - QUARANTINED_UNEXPECTED_CONTENT_TYPE
          bytes_rewritten: false`,
        }

        yield* App.pipe(
          Effect.provide(
            Layer.succeed(JobContext, {
              runId: 'run-1',
              concurrency: 1,
              startedAt: 0,
            })
          ),
          Effect.provide(
            Layer.succeed(
              MessageBatch,
              MessageBatch.of([
                {
                  message: {
                    data: Buffer.from(''),
                    attributes: {
                      bucketId: 'inmemory',
                      objectId: 'quarantined.sanitize.yml',
                    },
                    messageId: 'message-1',
                    publishTime: new Date('2026-10-01T00:00:00.000Z'),
                  },
                  ack: Effect.sync(() => acked.push('message-1')),
                },
              ])
            )
          ),
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(acked).toStrictEqual(['message-1'])
        expect(logs).toMatchObject([
          { level: 'INFO', message: ['Observation skipped'] },
          { level: 'INFO', message: ['No batch written'] },
          {
            level: 'INFO',
            message: ['Extractor job completed'],
            annotations: {
              event: 'extractor_job_completed',
              'job.tasks': 1,
              'job.successes': 1,
              'job.failures': 0,
              'job.rowsExtracted': 0,
            },
          },
        ])
      })
  )

  it.effect(
    'logs a failed message, leaves it unacked and completes at warning',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const acked: Array<string> = []

        yield* App.pipe(
          Effect.provide(
            Layer.succeed(JobContext, {
              runId: 'run-1',
              concurrency: 1,
              startedAt: 0,
            })
          ),
          Effect.provide(
            Layer.succeed(
              MessageBatch,
              MessageBatch.of([
                {
                  message: {
                    data: Buffer.from(''),
                    attributes: {
                      bucketId: 'inmemory',
                      objectId: 'missing.sanitize.yml',
                    },
                    messageId: 'message-1',
                    publishTime: new Date('2026-10-01T00:00:00.000Z'),
                    deliveryAttempt: 2,
                  },
                  ack: Effect.sync(() => acked.push('message-1')),
                },
              ])
            )
          ),
          Effect.provide(InMemoryStorageReader.layer({})),
          Effect.provide(InMemoryStorageWriter.layer({})),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(acked).toStrictEqual([])
        expect(logs).toMatchObject([
          { level: 'WARN', message: ['Message redelivered'] },
          {
            level: 'ERROR',
            message: ['Message processing failed'],
            annotations: {
              'error._tag': 'StorageReadError',
              'input.object': 'missing.sanitize.yml',
            },
          },
          { level: 'INFO', message: ['No batch written'] },
          {
            level: 'WARN',
            message: ['Extractor job completed'],
            annotations: { 'job.failures': 1 },
          },
        ])
      })
  )
})
