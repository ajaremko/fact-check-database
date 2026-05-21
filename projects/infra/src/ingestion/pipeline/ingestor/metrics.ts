import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

const labels = [
  {
    key: 'source.id',
    valueType: 'STRING',
    description: 'The ID of the source being ingested from',
  },
  {
    key: 'source.name',
    valueType: 'STRING',
    description: 'The name of the source being ingested from',
  },
  {
    key: 'source.url',
    valueType: 'STRING',
    description: 'The URL of the source being ingested from',
  },
  {
    key: 'source.collection',
    valueType: 'STRING',
    description: 'The type of collection of the source being ingested from',
  },
]

export const ingestorRequestCounterMetric = new gcp.monitoring.MetricDescriptor(
  `${tag}-pipeline-ingestor-requests`,
  {
    type: 'workload.googleapis.com/pipeline/ingest_http_requests',
    description: 'Number of HTTP GET requests made by the ingestor',
    displayName: 'Ingestor Requests count',
    metricKind: 'GAUGE',
    valueType: 'DOUBLE',
    labels,
  },
  { provider }
)

export const ingestorRequestFailureCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-ingestor-request-failures`,
    {
      type: 'workload.googleapis.com/pipeline/ingest_http_request_failures',
      description:
        'Number of HTTP GET requests made by the ingestor that resulted in client failure',
      displayName: 'Ingestor request failures count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels,
    },
    { provider }
  )

export const ingestorResponseStatusFrequencyMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-ingestor-response-status-frequency`,
    {
      type: 'workload.googleapis.com/pipeline/ingest_http_response_statuses',
      description: 'Frequency of HTTP response codes returned by the ingestor',
      displayName: 'Ingestor response code frequency',
      metricKind: 'GAUGE',
      valueType: 'DISTRIBUTION',
      labels,
    },
    { provider }
  )
