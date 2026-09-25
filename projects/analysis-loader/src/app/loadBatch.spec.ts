import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { Effect, HashMap, Layer, Logger } from 'effect'
import { BigQuery, Job } from '@google-cloud/bigquery'

import { BigQueryClient } from '@fact-check-database/core-vendor/bigquery/BigQueryClient'

import { loadBatch, loadJobId } from './loadBatch'

describe('loadJobId', () => {
  it('is deterministic for the same object version', () => {
    const result = loadJobId(
      { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
      '1'
    )
    expect(result).toBe(
      'load_9e4d060edfb663514250ee97d3797766793b2f1930e6b0fe3dad662a81e48fcc'
    )
    expect(result).toBe(
      loadJobId(
        { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
        '1'
      )
    )
  })

  it('differs across object versions', () => {
    expect(
      loadJobId(
        { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
        '2'
      )
    ).toBe(
      'load_af2c3ed1ba97d08ce0393bc92bf05d85e21c67e9ae05e22c52e5092ccfbfd3ad'
    )
  })

  it('differs across objects', () => {
    expect(loadJobId({ bucket: 'staging', object: 'b.ndjson' }, '1')).toBe(
      'load_3c09aac3353658ee24eccfe62328938acb3dad66fc56a6838c1212731ccb64c7'
    )
  })
})

describe('loadBatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect('creates a load job with the deterministic id', () =>
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

      yield* loadBatch({
        projectId: 'project',
        pointer: { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
        generation: '123',
        table: { dataset: 'staging', table: 'fact_checks' },
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        schema: {},
      }).pipe(
        Effect.provide(Layer.succeed(BigQueryClient, { client })),
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

      expect(logs).toStrictEqual([
        {
          level: 'INFO',
          message: ['Load job created'],
          annotations: {
            'batch.bucket': 'staging',
            'batch.object': 'v1/type=fact_checks/a.ndjson',
            'batch.generation': '123',
            'batch.datasetId': 'staging',
            'batch.tableId': 'fact_checks',
            'job.id':
              'load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911',
          },
        },
        {
          level: 'INFO',
          message: ['Load job completed'],
          annotations: {
            'batch.bucket': 'staging',
            'batch.object': 'v1/type=fact_checks/a.ndjson',
            'batch.generation': '123',
            'batch.datasetId': 'staging',
            'batch.tableId': 'fact_checks',
            'job.id':
              'load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911',
          },
        },
      ])
      expect(client.createJob).toHaveBeenCalledTimes(1)
      expect(client.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId:
            'load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911',
          location: 'US',
          configuration: expect.objectContaining({
            load: expect.objectContaining({
              destinationTable: {
                projectId: 'project',
                datasetId: 'staging',
                tableId: 'fact_checks',
              },
              sourceUris: ['gs://staging/v1/type=fact_checks/a.ndjson'],
            }),
          }),
        })
      )
    })
  )

  it.effect(
    'does not create a second job when the batch was already loaded',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const client = new BigQuery({ projectId: 'project' })
        vi.spyOn(client, 'createJob').mockRejectedValue(
          Object.assign(new Error('Already Exists'), { code: 409 })
        )
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

        yield* loadBatch({
          projectId: 'project',
          pointer: {
            bucket: 'staging',
            object: 'v1/type=fact_checks/a.ndjson',
          },
          generation: '123',
          table: { dataset: 'staging', table: 'fact_checks' },
          sourceFormat: 'NEWLINE_DELIMITED_JSON',
          schema: {},
        }).pipe(
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
          )
        )

        expect(client.createJob).toHaveBeenCalledTimes(1)
        expect(client.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            jobId:
              'load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911',
          })
        )
        expect(logs).toMatchObject([
          {
            level: 'INFO',
            message: ['Load job already exists for this batch, awaiting it'],
          },
          { level: 'INFO', message: ['Load job completed'] },
        ])
      })
  )

  it.effect('retries under a new id when the previous job failed', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      const client = new BigQuery({ projectId: 'project' })
      vi.spyOn(client, 'createJob')
        .mockRejectedValueOnce(
          Object.assign(new Error('Already Exists'), { code: 409 })
        )
        .mockImplementation(((options: { jobId: string }) =>
          Promise.resolve([client.job(options.jobId)])) as never)
      vi.spyOn(Job.prototype, 'getMetadata')
        .mockImplementationOnce(function (this: Job) {
          this.metadata = {
            status: { state: 'DONE', errorResult: { reason: 'backendError' } },
          }
          return Promise.resolve([this.metadata])
        } as never)
        .mockImplementation(function (this: Job, callback?: unknown) {
          this.metadata = { status: { state: 'DONE' } }
          if (typeof callback === 'function') {
            return callback(null, this.metadata)
          }
          return Promise.resolve([this.metadata])
        } as never)

      yield* loadBatch({
        projectId: 'project',
        pointer: { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
        generation: '123',
        table: { dataset: 'staging', table: 'fact_checks' },
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        schema: {},
      }).pipe(
        Effect.provide(Layer.succeed(BigQueryClient, { client })),
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
        {
          level: 'WARN',
          message: ['Previous load job for this batch failed, retrying'],
        },
        { level: 'INFO', message: ['Load job created'] },
        { level: 'INFO', message: ['Load job completed'] },
      ])
      expect(logs[0].annotations).toMatchObject({
        'job.retryId': expect.stringMatching(
          /^load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911_[0-9a-f-]{36}$/
        ),
      })
      expect(client.createJob).toHaveBeenCalledTimes(2)
      expect(client.createJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          jobId: expect.stringMatching(
            /^load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911_[0-9a-f-]{36}$/
          ),
        })
      )
    })
  )
})
