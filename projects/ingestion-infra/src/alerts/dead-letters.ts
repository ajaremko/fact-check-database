import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from '../config'
import { extractorSubscription } from '../extractor/subscription'
import { provider } from '../project'
import { sanitizerSubscription } from '../sanitizer/subscription'
import { monitoringService } from '../services'

import {
  ALERT_RUNBOOK,
  alertAutoClose,
  alertNotificationChannels,
} from './channel'

/**
 * A condition that is met when a subscription forwards any message to its
 * dead-letter topic: the message failed every delivery attempt.
 */
function deadLetteredCondition(
  stage: string,
  subscriptionId: pulumi.Input<string>
): gcp.types.input.monitoring.AlertPolicyCondition {
  return {
    displayName: `${stage} subscription dead-lettered a message`,
    conditionThreshold: {
      filter: pulumi.interpolate`metric.type="pubsub.googleapis.com/subscription/dead_letter_message_count" AND resource.type="pubsub_subscription" AND resource.label.subscription_id="${subscriptionId}"`,
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
 * Fires when the sanitizer's or the extractor's subscription gives up on a
 * message. Nothing reads the dead-letter bucket, so without this alert a
 * dead-lettered record is lost silently.
 */
export const deadLetterAlertPolicy = new gcp.monitoring.AlertPolicy(
  `${tag}-dead-letter-alert`,
  {
    displayName: 'Ingestion: messages dead-lettered',
    combiner: 'OR',
    severity: 'ERROR',
    conditions: [
      deadLetteredCondition('Sanitizer', sanitizerSubscription.name),
      deadLetteredCondition('Extractor', extractorSubscription.name),
    ],
    documentation: {
      mimeType: 'text/markdown',
      subject: 'Ingestion: messages dead-lettered',
      content: [
        'A message failed 5 delivery attempts and was moved to a dead-letter topic. The record it points to was not processed by that stage.',
        '',
        "The condition name says which stage: the sanitizer or the extractor. The message itself is archived in the dead-letter bucket under that stage's prefix.",
        '',
        "First check that stage's error logs around the time of the alert. Nothing replays dead-lettered messages automatically.",
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
