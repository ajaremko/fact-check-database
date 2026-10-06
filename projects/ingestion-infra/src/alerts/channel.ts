import * as gcp from '@pulumi/gcp'

import {
  alertAutoCloseSeconds,
  alertEmail,
  ingestionLabels,
  tag,
} from '../config'
import { provider } from '../project'
import { monitoringService } from '../services'

/**
 * Where alert notifications are sent. Created only when the stack sets
 * `ingestion:alertEmail`.
 */
export const alertEmailChannel = alertEmail
  ? new gcp.monitoring.NotificationChannel(
      `${tag}-alert-email-channel`,
      {
        displayName: 'Ingestion alerts email',
        type: 'email',
        labels: { email_address: alertEmail },
        userLabels: ingestionLabels,
      },
      { provider, dependsOn: [monitoringService] }
    )
  : undefined

/**
 * The channels every alert policy in this stack notifies. Empty when no
 * email is configured: incidents then show in Cloud Monitoring only.
 */
export const alertNotificationChannels = alertEmailChannel
  ? [alertEmailChannel.name]
  : []

/**
 * How long an incident stays open after its signal stops reporting data, as
 * the duration string an alert policy takes. Set per stack with
 * `ingestion:alertAutoCloseSeconds`.
 */
export const alertAutoClose = `${alertAutoCloseSeconds}s`

/**
 * The runbook section every alert's documentation points to.
 */
export const ALERT_RUNBOOK =
  'projects/ingestion-infra/docs/runbook.md, section "Alerts"'
