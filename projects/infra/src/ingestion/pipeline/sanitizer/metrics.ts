import * as gcp from '@pulumi/gcp'

import { provider } from '../../project'
import { tag } from '../../config'

export const sanitizerDecisionLabelMetric = new gcp.monitoring.MetricDescriptor(
  `${tag}-pipeline-sanitizer-decision-label`,
  {
    type: 'custom.googleapis.com/pipeline/sanitize_decision_labels',
    description: 'Policy decision label frequency for ingested content',
    displayName: 'Sanitizer Decision Label frequency',
    metricKind: 'GAUGE',
    valueType: 'DOUBLE',
  },
  { provider }
)
