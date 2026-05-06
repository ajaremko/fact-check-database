import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageWriter } from '../shared'

import * as FactChecksTableSchema from './FactChecksTableSchema'
import { writeBatch } from './writeBatch'

describe('writeBatch', () => {
  it.effect(
    'writes NDJSON file to storage and returns an ExtractionBatchReady event',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {}
        const event = yield* writeBatch({
          runId: 'run-001',
          extracted: [
            {
              id: '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
              observationId:
                'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
              ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
              extractionId: 'run-001',
              extractedAt: 0,
              fetchedAt: 0,
              factCheck: {
                sha256:
                  '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
                title: 'A false claim about something',
                claim: 'A false claim about something',
                verdict: 'false',
                link: 'https://example.com/fact-check-1',
                normalizedVerdict: 'false',
                summary: 'The claim is false.',
                publishedAt: 'Wed, 01 Jan 2026 00:00:00 +0000',
                canonicalUrl: null,
                extractorVersion: '1',
                extractedFrom: null,
              },
              http: {
                contentSha256:
                  '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
                status: 200,
                finalUrl: null,
                contentType: 'application/rss+xml',
                etag: null,
                lastModified: null,
                headers: {},
              },
              source: {
                id: 'politifact',
                name: 'politifact.com',
                url: 'https://www.politifact.com/rss/all/',
                collection: 'rss',
              },
            },
          ],
          extractedAt: 1_000,
          datasetId: 'research',
        }).pipe(
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provideService(
            FactChecksTableSchema.FactChecksTableSchema,
            FactChecksTableSchema.FactChecksTableSchema.of({
              fields: [
                {
                  name: 'content_lineage_id',
                  type: 'STRING',
                  mode: 'REQUIRED',
                },
                { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
                { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
                {
                  name: 'source',
                  type: 'RECORD',
                  mode: 'NULLABLE',
                  fields: [
                    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'name', type: 'STRING', mode: 'REQUIRED' },
                    { name: 'url', type: 'STRING', mode: 'REQUIRED' },
                  ],
                },
                {
                  name: 'fact_check',
                  type: 'RECORD',
                  mode: 'REQUIRED',
                  fields: [
                    { name: 'sha256', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'title', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'language', type: 'STRING', mode: 'NULLABLE' },
                    {
                      name: 'normalized_verdict',
                      type: 'STRING',
                      mode: 'NULLABLE',
                    },
                    {
                      name: 'extractor_version',
                      type: 'STRING',
                      mode: 'NULLABLE',
                    },
                    {
                      name: 'extracted_from',
                      type: 'STRING',
                      mode: 'NULLABLE',
                    },
                  ],
                },
                {
                  name: 'http',
                  type: 'RECORD',
                  mode: 'REQUIRED',
                  fields: [
                    {
                      name: 'content_sha256',
                      type: 'STRING',
                      mode: 'REQUIRED',
                    },
                    { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'status_code', type: 'INTEGER', mode: 'NULLABLE' },
                    { name: 'etag', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'content_type', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'last_modified', type: 'STRING', mode: 'NULLABLE' },
                    { name: 'headers', type: 'JSON', mode: 'NULLABLE' },
                  ],
                },
              ],
            })
          )
        )

        expect(storage['fact-checks/run-001.ndjson']).toBeDefined()
        expect(event).toStrictEqual({
          version: 1,
          extraction_batch_id: 'run-001',
          extracted_at: 1_000,
          source_format: 'NEWLINE_DELIMITED_JSON',
          table: {
            dataset_id: 'research',
            table_id: 'fact-checks',
          },
          schema: {
            fields: [
              { name: 'content_lineage_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
              { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
              { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
              {
                name: 'source',
                type: 'RECORD',
                mode: 'NULLABLE',
                fields: [
                  { name: 'id', type: 'STRING', mode: 'REQUIRED' },
                  { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
                  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
                  { name: 'url', type: 'STRING', mode: 'REQUIRED' },
                ],
              },
              {
                name: 'fact_check',
                type: 'RECORD',
                mode: 'REQUIRED',
                fields: [
                  { name: 'sha256', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'title', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'language', type: 'STRING', mode: 'NULLABLE' },
                  {
                    name: 'normalized_verdict',
                    type: 'STRING',
                    mode: 'NULLABLE',
                  },
                  {
                    name: 'extractor_version',
                    type: 'STRING',
                    mode: 'NULLABLE',
                  },
                  { name: 'extracted_from', type: 'STRING', mode: 'NULLABLE' },
                ],
              },
              {
                name: 'http',
                type: 'RECORD',
                mode: 'REQUIRED',
                fields: [
                  { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
                  { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'status_code', type: 'INTEGER', mode: 'NULLABLE' },
                  { name: 'etag', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'content_type', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'last_modified', type: 'STRING', mode: 'NULLABLE' },
                  { name: 'headers', type: 'JSON', mode: 'NULLABLE' },
                ],
              },
            ],
          },
          pointer: {
            bucket: 'inmemory',
            object: 'fact-checks/run-001.ndjson',
          },
        })
      })
  )
})
