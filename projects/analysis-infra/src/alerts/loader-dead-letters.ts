import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { analysisLabels, tag } from '../config'
import { provider } from '../project'
import { monitoringService } from '../services'
import { stagingStorageSubscription } from '../staging-dataset/loader/subscription'

import {
  ALERT_RUNBOOK,
  alertAutoClose,
  alertNotificationChannels,
} from './channel'

/**
 * Fires when the staging loader's subscription gives up on a batch
 * notification: the message failed every delivery attempt, so that batch was
 * not loaded into the staging table. Nothing reads the dead-letter bucket,
 * so without this alert a batch that never loads goes unnoticed.
 */
export const loaderDeadLetterAlertPolicy = new gcp.monitoring.AlertPolicy(
  `${tag}-loader-dead-letter-alert`,
  {
    displayName: 'Analysis: batches dead-lettered',
    combiner: 'OR',
    severity: 'ERROR',
    conditions: [
      {
        displayName: 'Staging loader subscription dead-lettered a message',
        conditionThreshold: {
          filter: pulumi.interpolate`metric.type="pubsub.googleapis.com/subscription/dead_letter_message_count" AND resource.type="pubsub_subscription" AND resource.label.subscription_id="${stagingStorageSubscription.name}"`,
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
      subject: 'Analysis: batches dead-lettered',
      content: [
        'A batch notification failed 5 delivery attempts to the staging loader and was moved to the dead-letter topic. The batch it points to was not loaded into the staging table, so its fact checks are missing from staging and will not reach the curated table.',
        '',
        "First check the staging loader's error logs around the time of the alert, then the BigQuery job history for a failed load job. The message is archived in the dead-letter bucket and names the batch file.",
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
