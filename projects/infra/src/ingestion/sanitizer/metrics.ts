import * as gcp from '@pulumi/gcp'

import { provider } from '../project'
import { tag } from '../config'

export const sanitizerRecordsCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-sanitizer-records-counter`,
    {
      type: 'workload.googleapis.com/pipeline/content_records_sanitized',
      description:
        'Count of ingested records processed by the sanitizer, tagged by policy decision and source',
      displayName: 'Content Records Sanitized count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      labels: [
        {
          key: 'decision_label',
          valueType: 'STRING',
          description: 'Policy decision label (e.g. SAFE_PUBLIC, QUARANTINE)',
        },
        {
          key: 'source_id',
          valueType: 'STRING',
          description: 'ID of the source the record was ingested from',
        },
        {
          key: 'source_name',
          valueType: 'STRING',
          description: 'Name of the source the record was ingested from',
        },
        {
          key: 'source_url',
          valueType: 'STRING',
          description: 'URL of the source the record was ingested from',
        },
        {
          key: 'source_collection',
          valueType: 'STRING',
          description:
            'Collection type of the source the record was ingested from',
        },
      ],
    },
    { provider }
  )
