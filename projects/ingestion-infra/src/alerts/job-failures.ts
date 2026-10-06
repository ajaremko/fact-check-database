import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from '../config'
import { extractorJob } from '../extractor/job'
import { ingestorJob } from '../ingestor/job'
import { provider } from '../project'
import { monitoringService } from '../services'

import {
  ALERT_RUNBOOK,
  alertAutoClose,
  alertNotificationChannels,
} from './channel'

/**
 * A condition that is met when any execution of a Cloud Run job finishes as
 * failed. It reads Cloud Run's own count of executions, so it also catches a
 * job that was killed before it could log anything.
 */
function failedExecutionCondition(
  stage: string,
  jobName: pulumi.Input<string>
): gcp.types.input.monitoring.AlertPolicyCondition {
  return {
    displayName: `${stage} job execution failed`,
    conditionThreshold: {
      filter: pulumi.interpolate`metric.type="run.googleapis.com/job/completed_execution_count" AND resource.type="cloud_run_job" AND resource.label.job_name="${jobName}" AND metric.label.result="failed"`,
      aggregations: [
        { alignmentPeriod: '300s', perSeriesAligner: 'ALIGN_SUM' },
      ],
      comparison: 'COMPARISON_GT',
      thresholdValue: 0,
      duration: '0s',
    },
  }
}

/**
 * Fires when a scheduled ingestor or extractor run fails. A failed ingestor
 * run means a fetch cycle was missed or fell below its success threshold; a
 * failed extractor run wrote no batch, and its records wait for the next one.
 */
export const jobFailureAlertPolicy = new gcp.monitoring.AlertPolicy(
  `${tag}-job-failure-alert`,
  {
    displayName: 'Ingestion: job execution failed',
    combiner: 'OR',
    severity: 'ERROR',
    conditions: [
      failedExecutionCondition('Ingestor', ingestorJob.name),
      failedExecutionCondition('Extractor', extractorJob.name),
    ],
    documentation: {
      mimeType: 'text/markdown',
      subject: 'Ingestion: job execution failed',
      content: [
        'A Cloud Run job execution finished as failed. The condition name says which job: the ingestor or the extractor.',
        '',
        'An ingestor failure means the run crashed or fewer sources succeeded than its success threshold allows. An extractor failure means no batch was written for that run; its records are redelivered to the next run.',
        '',
        'First open the failed execution in Cloud Run and read its logs. The jobs log a fatal `... job stopped` or `... failed to start` line with the cause, unless the container was killed first (for example, out of memory).',
        '',
        `Runbook: ${ALERT_RUNBOOK}.`,
      ].join('\n'),
    },
    alertStrategy: { autoClose: alertAutoClose },
    notificationChannels: alertNotificationChannels,
    userLabels: ingestionLabels,
  },
  { provider, dependsOn: [monitoringService] }
)
