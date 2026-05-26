import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

export const sanitizerRecordsCounterMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-sanitizer-records-counter`,
    {
      type: 'workload.googleapis.com/pipeline/sanitize_records_sanitized',
      description: 'Count of ingested records sanitized',
      displayName: 'Records Sanitized count',
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
    },
    { provider }
  )

export const sanitizerDecisionLabelFrequencyMetric =
  new gcp.monitoring.MetricDescriptor(
    `${tag}-pipeline-sanitizer-decision-label`,
    {
      type: 'workload.googleapis.com/pipeline/sanitize_decision_labels',
      description: 'Policy decision label frequency for ingested content',
      displayName: 'Sanitizer Decision Label frequency',
      metricKind: 'CUMULATIVE',
      valueType: 'DOUBLE',
      unit: '1',
      labels: [
        {
          key: 'key',
          valueType: 'STRING',
          description: 'Decision Label (e.g. SAFE_PUBLIC, QUARANTINE, etc.)',
        },
      ],
    },
    { provider }
  )
