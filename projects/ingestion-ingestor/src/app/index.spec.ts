import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Layer, Logger } from 'effect'

import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'
import { StorageWriteError, StorageWriter } from '@fact-check-database/core-io'

import * as InMemoryFetcher from '../adapters/InMemoryFetcher'
import { FetchFailureSchema, FetchSuccessSchema } from '../ports/Fetcher'
import { SourceList } from './SourceList'

import { App, JobContext, SuccessThresholdNotMet } from './index'

describe('App', () => {
  it.effect('logs the job as completed at info when it passes', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* App.pipe(
        Effect.provide(
          Layer.succeed(JobContext, {
            runId: 'run-1',
            concurrency: 1,
            startedAt: 0,
            successThreshold: 0.8,
          })
        ),
        Effect.provide(
          Layer.succeed(
            SourceList,
            SourceList.of({
              sources: [
                {
                  id: 'politifact',
                  name: 'politifact.com',
                  url: 'https://www.politifact.com/rss/all/',
                  collection: 'rss',
                  timeoutSeconds: 30,
                },
              ],
            })
          )
        ),
        Effect.provide(
          InMemoryFetcher.layer(
            FetchSuccessSchema.make({
              finalUrl: 'https://www.politifact.com/rss/all/',
              status: 200,
              headers: {},
              contentType: 'application/rss+xml',
              etag: null,
              lastModified: null,
              bytes: 0,
              sha256:
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              body: new Uint8Array(),
              error: null,
            })
          )
        ),
        Effect.provide(InMemoryStorageWriter.layer({})),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Source fetched'] },
        {
          level: 'INFO',
          message: ['Ingestor job completed'],
          annotations: {
            event: 'ingestor_job_completed',
            'job.successRate': 1,
            'job.tasks': 1,
            'job.successes': 1,
            'job.failures': 0,
            'job.result': 'success',
          },
        },
      ])
    })
  )

  it.effect(
    'logs the job as completed at error and fails when below the threshold',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []

        const result = yield* App.pipe(
          Effect.flip,
          Effect.provide(
            Layer.succeed(JobContext, {
              runId: 'run-1',
              concurrency: 1,
              startedAt: 0,
              successThreshold: 0.8,
            })
          ),
          Effect.provide(
            Layer.succeed(
              SourceList,
              SourceList.of({
                sources: [
                  {
                    id: 'baddata',
                    name: 'baddata.com',
                    url: 'https://baddata.com/rss.xml',
                    collection: 'rss',
                    timeoutSeconds: 30,
                  },
                ],
              })
            )
          ),
          Effect.provide(
            InMemoryFetcher.layer(
              FetchFailureSchema.make({
                error: 'Transport error (GET https://baddata.com/rss.xml)',
              })
            )
          ),
          // Every write fails, so the one source's pipeline fails
          Effect.provide(
            Layer.succeed(StorageWriter, {
              write: (opts) =>
                Effect.fail(
                  new StorageWriteError({
                    cause: new Error('Storage unavailable'),
                    path: opts.path,
                    bucket: 'inmemory',
                    message: 'Failed to write file',
                  })
                ),
            })
          ),
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

        expect(result).toStrictEqual(
          new SuccessThresholdNotMet({ successRate: 0, successThreshold: 0.8 })
        )
        expect(logs).toMatchObject([
          {
            level: 'ERROR',
            message: ['Source ingestion failed'],
            annotations: {
              'source.id': 'baddata',
              'error._tag': 'StorageWriteError',
            },
          },
          {
            level: 'ERROR',
            message: ['Ingestor job completed'],
            annotations: {
              event: 'ingestor_job_completed',
              'job.successRate': 0,
              'job.result': 'failure',
            },
          },
        ])
      })
  )
})
