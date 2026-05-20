import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

export const extractorFactCheckRowCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-fact-check-rows`,
    {
      type: 'custom.googleapis.com/pipeline/extracted_fact_check_rows',
      description: 'Number of fact check rows extracted by the extractor',
      displayName: 'Extracted Fact Check Rows count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
    },
    { provider }
  )

export const extractorBatchesWrittenCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-batches-written`,
    {
      type: 'custom.googleapis.com/pipeline/extracted_batches_written',
      description: 'Number of batches written by the extractor',
      displayName: 'Extracted Batches Written count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
    },
    { provider }
  )

export const extractorRowsPerBatchHistogramMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-extractor-rows-per-batch`,
    {
      type: 'custom.googleapis.com/pipeline/extracted_rows_per_batch',
      description: 'Number of rows per batch written by the extractor',
      displayName: 'Extracted Rows Per Batch',
      metricKind: 'GAUGE',
      valueType: 'DISTRIBUTION',
    },
    { provider }
  )
