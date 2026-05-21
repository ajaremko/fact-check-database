import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

export const loaderBatchesLoadedCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-loader-batches-loaded`,
    {
      type: 'workload.googleapis.com/pipeline/loaded_batches',
      description: 'Number of batches loaded into BigQuery',
      displayName: 'Loaded Batches count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'batch.tableId',
          valueType: 'STRING',
          description: 'The ID of the table being written to',
        },
        {
          key: 'batch.datasetId',
          valueType: 'STRING',
          description: 'The ID of the dataset being written to',
        },
      ],
    },
    { provider }
  )
