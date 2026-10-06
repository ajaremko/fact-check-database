import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { extractorBacklogAlertHours, ingestionLabels, tag } from '../config'
import { extractorSubscription } from '../extractor/subscription'
import { provider } from '../project'
import { monitoringService } from '../services'

import {
  ALERT_RUNBOOK,
  alertAutoClose,
  alertNotificationChannels,
} from './channel'

/**
 * Fires when sanitizer records wait too long for the extractor. The
 * extractor's pull subscription is the only buffer between the two stages,
 * and Pub/Sub drops a message once it is older than the subscription's
 * retention, so an ageing backlog ends in records that are never extracted.
 */
export const extractorBacklogAlertPolicy = new gcp.monitoring.AlertPolicy(
  `${tag}-extractor-backlog-alert`,
  {
    displayName: 'Ingestion: extractor backlog is ageing',
    combiner: 'OR',
    severity: 'ERROR',
    conditions: [
      {
        displayName: `Oldest unextracted record is over ${extractorBacklogAlertHours}h old`,
        conditionThreshold: {
          filter: pulumi.interpolate`metric.type="pubsub.googleapis.com/subscription/oldest_unacked_message_age" AND resource.type="pubsub_subscription" AND resource.label.subscription_id="${extractorSubscription.name}"`,
          aggregations: [
            { alignmentPeriod: '300s', perSeriesAligner: 'ALIGN_MAX' },
          ],
          comparison: 'COMPARISON_GT',
          thresholdValue: extractorBacklogAlertHours * 3600,
          duration: '0s',
        },
      },
    ],
    documentation: {
      mimeType: 'text/markdown',
      subject: 'Ingestion: extractor backlog is ageing',
      content: [
        `The oldest sanitizer record waiting for the extractor is more than ${extractorBacklogAlertHours} hours old.`,
        '',
        'The extractor has missed a run, is failing, or is taking in fewer records per run than arrive. Records older than the subscription retention (7 days) are dropped by Pub/Sub and never extracted.',
        '',
        'First check the extractor job\'s recent executions in Cloud Run, then the "Unacked Messages" panel of the ingestion dashboard.',
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
