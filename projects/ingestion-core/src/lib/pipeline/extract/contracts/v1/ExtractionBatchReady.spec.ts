import { Schema } from 'effect'

import { BigQueryTableSchemaSchema } from './ExtractionBatchReady'

describe('BigQueryTableSchemaSchema', () => {
  it('should decode a valid BigQuery table schema', () => {
    expect(
      Schema.decodeUnknownSync(BigQueryTableSchemaSchema)({
        fields: [
          {
            name: 'field1',
            type: 'STRING',
            mode: 'NULLABLE',
          },
        ],
      })
    ).toStrictEqual({
      fields: [
        {
          name: 'field1',
          type: 'STRING',
          mode: 'NULLABLE',
        },
      ],
    })
  })

  it('should decode a BigQuery table schema with nested fields', () => {
    expect(
      Schema.decodeUnknownSync(BigQueryTableSchemaSchema)({
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
        ],
      })
    ).toStrictEqual({
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
      ],
    })
  })
})
