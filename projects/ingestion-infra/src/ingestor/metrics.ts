import * as gcp from '@pulumi/gcp'

import { provider } from '../project'
import { tag } from '../config'

export const ingestorContentRequestResultsCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-ingestor-content-request-results-counter`,
    {
      type: 'workload.googleapis.com/pipeline/content_request_results',
      description:
        'Count of HTTP responses received when ingesting content, tagged by status code and content type',
      displayName: 'Content Request Responses count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'source_name',
          valueType: 'STRING',
          description: 'The name of the source being ingested from',
        },
        {
          key: 'source_collection',
          valueType: 'STRING',
          description: 'The collection type of the source being ingested from',
        },
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
