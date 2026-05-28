import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

const sourceLabels = [
  {
    key: 'source_id',
    valueType: 'STRING',
    description: 'The ID of the source being ingested from',
  },
  {
    key: 'source_name',
    valueType: 'STRING',
    description: 'The name of the source being ingested from',
  },
  {
    key: 'source_url',
    valueType: 'STRING',
    description: 'The URL of the source being ingested from',
  },
  {
    key: 'source_collection',
    valueType: 'STRING',
    description: 'The collection type of the source being ingested from',
  },
]

export const ingestorRequestCounterMetric = new gcp.monitoring.MetricDescriptor(
  `${tag}-pipeline-ingestor-requests`,
  {
    type: 'workload.googleapis.com/pipeline/content_requests',
    description: 'Number of HTTP GET requests made by the ingestor',
    displayName: 'Content Requests count',
    metricKind: 'GAUGE',
    valueType: 'DOUBLE',
    labels: sourceLabels,
  },
  { provider }
)

export const ingestorRequestFailureCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-ingestor-request-failures`,
    {
      type: 'workload.googleapis.com/pipeline/content_request_failures',
      description:
        'Number of HTTP GET requests made by the ingestor that resulted in failure',
      displayName: 'Content Request Failures count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: sourceLabels,
    },
    { provider }
  )

export const ingestorResponseCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-ingestor-response-counter`,
    {
      type: 'workload.googleapis.com/pipeline/content_request_responses',
      description:
        'Count of HTTP responses received when ingesting content, tagged by status code and content type',
      displayName: 'Content Request Responses count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        ...sourceLabels,
        {
          key: 'result_status',
          valueType: 'STRING',
          description:
            'HTTP status message (e.g. OK, Not Found, Internal Server Error)',
        },
        {
          key: 'result_status_code',
          valueType: 'STRING',
          description: 'HTTP status code (e.g. 200, 404, 500)',
        },
        {
          key: 'result_content_type',
          valueType: 'STRING',
          description: 'HTTP response content type',
        },
      ],
    },
    { provider }
  )
