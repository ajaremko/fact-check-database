import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { ConfigProvider, Effect, HashMap, Layer, Logger } from 'effect'
import { HttpServerRequest } from '@effect/platform'
import { BigQuery, Job } from '@google-cloud/bigquery'

import { BigQueryClient } from '@fact-check-database/core-vendor/bigquery/BigQueryClient'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'

import { router } from './index'
import { provideServiceContext } from './config'
import { provideSchemaReader } from './readSchema'

describe('POST /load-jobs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect(
    'loads the batch, logs its lifecycle at info and responds 201',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const client = new BigQuery({ projectId: 'project' })
        vi.spyOn(client, 'createJob').mockImplementation(((options: {
          jobId: string
        }) => Promise.resolve([client.job(options.jobId)])) as never)
        vi.spyOn(Job.prototype, 'getMetadata').mockImplementation(function (
          this: Job,
          callback?: unknown
        ) {
          this.metadata = { status: { state: 'DONE' } }
          if (typeof callback === 'function') {
            return callback(null, this.metadata)
          }
          return Promise.resolve([this.metadata])
        } as never)

        const result = yield* router.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request('http://localhost/load-jobs', {
                method: 'POST',
                body: JSON.stringify({
                  message: {
                    data: '',
                    attributes: {
                      bucketId: 'staging',
                      objectId: 'v1/type=fact_checks/a.ndjson',
                      objectGeneration: '123',
                      schemaObjectId: 'schemas/fact_checks.json',
                    },
                    messageId: 'message-1',
                    publishTime: '2026-09-25T00:00:00Z',
                  },
                  subscription: 'projects/project/subscriptions/load-jobs',
                  deliveryAttempt: 1,
                }),
              })
            )
          ),
          provideSchemaReader,
          provideServiceContext,
          Effect.provide(
            InMemoryStorageReader.layer({ 'schemas/fact_checks.json': '{}' })
          ),
          Effect.provide(Layer.succeed(BigQueryClient, { client })),
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
          ),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ['PROJECT_ID', 'project'],
                ['BIGQUERY_DATASET', 'staging'],
                ['BIGQUERY_TABLE', 'fact_checks'],
              ])
            )
          ),
          Effect.scoped
        )

        expect(result.status).toBe(201)
        expect(logs).toMatchObject([
          { level: 'INFO', message: ['Load request received'] },
          { level: 'INFO', message: ['Batch schema read'] },
          { level: 'INFO', message: ['Load job created'] },
          { level: 'INFO', message: ['Load job completed'] },
          { level: 'INFO', message: ['Batch loaded'] },
        ])
        expect(logs[4].annotations).toStrictEqual({
          'batch.datasetId': 'staging',
          'batch.tableId': 'fact_checks',
          'message.messageId': 'message-1',
          subscription: 'projects/project/subscriptions/load-jobs',
          'message.deliveryAttempt': 1,
          'batch.bucket': 'staging',
          'batch.object': 'v1/type=fact_checks/a.ndjson',
          'batch.generation': '123',
          'schema.object': 'schemas/fact_checks.json',
        })
      })
  )

  it.effect('logs one error and responds 500 when the schema is missing', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      const result = yield* router.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request('http://localhost/load-jobs', {
              method: 'POST',
              body: JSON.stringify({
                message: {
                  data: '',
                  attributes: {
                    bucketId: 'staging',
                    objectId: 'v1/type=fact_checks/a.ndjson',
                    objectGeneration: '123',
                    schemaObjectId: 'schemas/missing.json',
                  },
                  messageId: 'message-1',
                  publishTime: '2026-09-25T00:00:00Z',
                },
                subscription: 'projects/project/subscriptions/load-jobs',
              }),
            })
          )
        ),
        provideSchemaReader,
        provideServiceContext,
        Effect.provide(InMemoryStorageReader.layer({})),
        Effect.provide(
          Layer.succeed(BigQueryClient, {
            client: new BigQuery({ projectId: 'project' }),
          })
        ),
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
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ['PROJECT_ID', 'project'],
              ['BIGQUERY_DATASET', 'staging'],
              ['BIGQUERY_TABLE', 'fact_checks'],
            ])
          )
        ),
        Effect.scoped
      )

      expect(result.status).toBe(500)
      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Load request received'] },
        {
          level: 'ERROR',
          message: ['Load request failed'],
          annotations: {
            'error._tag': 'StorageReadError',
            'response.status': 500,
            'schema.object': 'schemas/missing.json',
          },
        },
      ])
    })
  )

  it.effect('logs a warning when the message is a redelivery', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* router.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request('http://localhost/load-jobs', {
              method: 'POST',
              body: JSON.stringify({
                message: {
                  data: '',
                  attributes: {
                    bucketId: 'staging',
                    objectId: 'v1/type=fact_checks/a.ndjson',
                    objectGeneration: '123',
                    schemaObjectId: 'schemas/missing.json',
                  },
                  messageId: 'message-1',
                  publishTime: '2026-09-25T00:00:00Z',
                },
                subscription: 'projects/project/subscriptions/load-jobs',
                deliveryAttempt: 3,
              }),
            })
          )
        ),
        provideSchemaReader,
        provideServiceContext,
        Effect.provide(InMemoryStorageReader.layer({})),
        Effect.provide(
          Layer.succeed(BigQueryClient, {
            client: new BigQuery({ projectId: 'project' }),
          })
        ),
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
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ['PROJECT_ID', 'project'],
              ['BIGQUERY_DATASET', 'staging'],
              ['BIGQUERY_TABLE', 'fact_checks'],
            ])
          )
        ),
        Effect.scoped
      )

      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Load request received'] },
        {
          level: 'WARN',
          message: ['Message redelivered'],
          annotations: { 'message.deliveryAttempt': 3 },
        },
        { level: 'ERROR', message: ['Load request failed'] },
      ])
    })
  )
})
