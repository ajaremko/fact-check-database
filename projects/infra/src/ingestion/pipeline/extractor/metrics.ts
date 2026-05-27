import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

export const extractorFactCheckRowCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-fact-check-rows`,
    {
      type: 'workload.googleapis.com/pipeline/extracted_fact_check_rows',
      description: 'Number of fact check rows extracted by the extractor',
      displayName: 'Extracted Fact Check Rows count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'source_id',
          valueType: 'STRING',
          description: 'The ID of the source the rows were extracted from',
        },
        {
          key: 'source_name',
          valueType: 'STRING',
          description: 'The name of the source the rows were extracted from',
        },
        {
          key: 'source_url',
          valueType: 'STRING',
          description: 'The URL of the source the rows were extracted from',
        },
        {
          key: 'source_collection',
          valueType: 'STRING',
          description:
            'The collection type of the source the rows were extracted from',
        },
        {
          key: 'extractor_id',
          valueType: 'STRING',
          description: 'ID of the extractor that produced the rows',
        },
        {
          key: 'extractor_version',
          valueType: 'STRING',
          description: 'Version of the extractor that produced the rows',
        },
      ],
    },
    { provider }
  )

export const extractorBatchesWrittenCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-batches-written`,
    {
      type: 'workload.googleapis.com/pipeline/extracted_batches_written',
      description: 'Number of batches written by the extractor',
      displayName: 'Extracted Batches Written count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'table_dataset_id',
          valueType: 'STRING',
          description: 'Dataset ID of the destination table',
        },
        {
          key: 'table_table_id',
          valueType: 'STRING',
          description: 'Table ID of the destination table',
        },
      ],
    },
    { provider }
  )

export const extractorRowsPerBatchCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-rows-per-batch-counter`,
    {
      type: 'workload.googleapis.com/pipeline/extracted_rows_per_batch',
      description:
        'Total rows written per batch, tagged by job run ID to allow per-run aggregation',
      displayName: 'Extracted Rows Per Batch count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'table_dataset_id',
          valueType: 'STRING',
          description: 'Dataset ID of the destination table',
        },
        {
          key: 'table_table_id',
          valueType: 'STRING',
          description: 'Table ID of the destination table',
        },
        {
          key: 'job_run_id',
          valueType: 'STRING',
          description: 'Run ID of the job that wrote the batch',
        },
      ],
    },
    { provider }
  )
