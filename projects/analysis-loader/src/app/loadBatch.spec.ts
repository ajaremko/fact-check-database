import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import type { BigQuery } from '@google-cloud/bigquery'

import { BigQueryClient } from '@fact-check-database/core-vendor/bigquery/BigQueryClient'

import { loadBatch, loadJobId } from './loadBatch'

const pointer = { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' }

type FakeJob = {
  id: string
  metadata: { status: { state: string; errorResult?: unknown } }
  getMetadata: () => Promise<unknown>
  on: (event: string, cb: (arg?: unknown) => void) => FakeJob
}

function fakeJob(id: string, errorResult?: unknown): FakeJob {
  const job: FakeJob = {
    id,
    metadata: { status: { state: 'DONE', errorResult } },
    getMetadata: () => Promise.resolve([job.metadata]),
    on: (event, cb) => {
      if (event === 'complete' && !errorResult) queueMicrotask(() => cb())
      if (event === 'error' && errorResult)
        queueMicrotask(() => cb(errorResult))
      return job
    },
  }
  return job
}

/**
 * A fake BigQuery client backed by an in-memory job registry that, like the
 * real API, rejects a `createJob` whose `jobId` is already taken.
 */
function fakeClient(existing: FakeJob[] = []) {
  const jobs = new Map(existing.map((job) => [job.id, job]))
  const created: string[] = []
  const client = {
    createJob: (options: { jobId: string }) => {
      if (jobs.has(options.jobId)) {
        return Promise.reject(
          Object.assign(new Error('Already Exists'), { code: 409 })
        )
      }
      const job = fakeJob(options.jobId)
      jobs.set(options.jobId, job)
      created.push(options.jobId)
      return Promise.resolve([job])
    },
    job: (id: string) => {
      const job = jobs.get(id)
      if (!job) throw new Error(`no job ${id}`)
      return job
    },
  }
  const layer = Layer.succeed(BigQueryClient, {
    client: client as unknown as BigQuery,
  })
  return { layer, created }
}

const input = {
  projectId: 'project',
  pointer,
  generation: '123',
  table: { dataset: 'staging', table: 'fact_checks' },
  sourceFormat: 'NEWLINE_DELIMITED_JSON',
  schema: {},
}

describe('loadJobId', () => {
  it('is deterministic for the same object version', () => {
    expect(loadJobId(pointer, '1')).toEqual(loadJobId(pointer, '1'))
    expect(loadJobId(pointer, '1')).toMatch(/^load_[0-9a-f]{64}$/)
  })

  it('differs across object versions and objects', () => {
    expect(loadJobId(pointer, '1')).not.toEqual(loadJobId(pointer, '2'))
    expect(loadJobId(pointer, '1')).not.toEqual(
      loadJobId({ ...pointer, object: 'b.ndjson' }, '1')
    )
  })
})

describe('loadBatch', () => {
  it.effect('creates a load job with the deterministic id', () =>
    Effect.gen(function* () {
      const { layer, created } = fakeClient()
      yield* loadBatch(input).pipe(Effect.provide(layer))
      expect(created).toEqual([loadJobId(pointer, '123')])
    })
  )

  it.effect(
    'does not create a second job when the batch was already loaded',
    () =>
      Effect.gen(function* () {
        const { layer, created } = fakeClient([
          fakeJob(loadJobId(pointer, '123')),
        ])
        yield* loadBatch(input).pipe(Effect.provide(layer))
        expect(created).toEqual([])
      })
  )

  it.effect('retries under a new id when the previous job failed', () =>
    Effect.gen(function* () {
      const jobId = loadJobId(pointer, '123')
      const { layer, created } = fakeClient([
        fakeJob(jobId, { reason: 'backendError' }),
      ])
      yield* loadBatch(input).pipe(Effect.provide(layer))
      expect(created).toHaveLength(1)
      expect(created[0].startsWith(`${jobId}_`)).toBe(true)
    })
  )
})
