import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { analysisLabels, tag } from '../config'
import { stagingToCuratedTransferJob } from '../curated-dataset/loader/transfer-job'
import { provider } from '../project'
import { monitoringService } from '../services'

import {
  ALERT_RUNBOOK,
  alertAutoClose,
  alertNotificationChannels,
} from './channel'

// The transfer metric identifies a config by its id: the last segment of
// the resource name `projects/…/locations/…/transferConfigs/{id}`.
const transferConfigId = stagingToCuratedTransferJob.name.apply(
  (name) => name.split('/').pop() ?? name
)

/**
 * Fires when a run of the scheduled query that merges staging into the
 * curated table finishes without succeeding. A failed run leaves the curated
 * table as it was; the next successful run catches up, as long as it happens
 * before the staging rows expire.
 */
export const transferFailureAlertPolicy = new gcp.monitoring.AlertPolicy(
  `${tag}-transfer-failure-alert`,
  {
    displayName: 'Analysis: curated transfer run failed',
    combiner: 'OR',
    severity: 'ERROR',
    conditions: [
      {
        displayName: 'Curated transfer run did not succeed',
        conditionThreshold: {
          // Every outcome other than SUCCEEDED counts: a failed run and a
          // cancelled one both leave the curated table without that run.
          filter: pulumi.interpolate`metric.type="bigquerydatatransfer.googleapis.com/transfer_config/completed_runs" AND resource.type="bigquery_dts_config" AND resource.label.config_id="${transferConfigId}" AND metric.label.completion_state!="SUCCEEDED"`,
          aggregations: [
            { alignmentPeriod: '300s', perSeriesAligner: 'ALIGN_SUM' },
          ],
          comparison: 'COMPARISON_GT',
          thresholdValue: 0,
          duration: '0s',
        },
      },
    ],
    documentation: {
      mimeType: 'text/markdown',
      subject: 'Analysis: curated transfer run failed',
      content: [
        'A run of the "Curated Fact Checks Transfer Job" scheduled query finished without succeeding. The curated table was not updated by that run.',
        '',
        'The query reads the last 7 days of staging and is safe to run again, so the next successful run catches up. Staging rows expire after 7 days: runs that keep failing for longer than that lose data.',
        '',
        "First open the transfer's run history in BigQuery (Data transfers) and read the failed run's error message.",
        '',
        `Runbook: ${ALERT_RUNBOOK}.`,
      ].join('\n'),
    },
    alertStrategy: { autoClose: alertAutoClose },
    notificationChannels: alertNotificationChannels,
    userLabels: analysisLabels,
  },
  { provider, dependsOn: [monitoringService] }
)
