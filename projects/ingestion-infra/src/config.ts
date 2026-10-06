import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'ingestion'

const ingestionConfig = new pulumi.Config('ingestion')

const coreStackName = ingestionConfig.require('coreStackName')
// Format: <organization>/<project>/<stack>
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)

export const coreProject = coreStackRef.getOutput('gcpProject')
export const coreRegion = coreStackRef.getOutput('gcpRegion')

export const stagingStorageTopicName = coreStackRef.getOutput(
  'stagingStorageTopicName'
)
export const stagingStorageBucketName = coreStackRef.getOutput(
  'stagingStorageBucketName'
)

// Retrieve exported artifact registry details
export const artifactRegistryLocation = coreStackRef.getOutput(
  'artifactRegistryLocation'
)
export const artifactRegistryName = coreStackRef.getOutput(
  'artifactRegistryName'
)
export const artifactRegistryRepositoryId = coreStackRef.getOutput(
  'artifactRegistryRepositoryId'
)

export const gcsArchiveKeyId = coreStackRef.getOutput('gcsArchiveKeyId')

/**
 * The GCP project where all ingestion resources will be created.
 */
export const gcpProject = ingestionConfig.require('project')

/**
 * The GCP region where resources will be created. This should be the same region as the
 * one used for the analysis datasets to optimize performance and reduce costs.
 */
export const gcpRegion = ingestionConfig.require('region')

/**
 * The Docker image tag to use for all ingestion pipeline components.
 * This should correspond to a tag in the container registry where the
 * ingestion pipeline images are stored.
 */
export const dockerTag = ingestionConfig.get('tag')

/**
 * The schedule for the ingestor job in cron format. This determines how
 * often the ingestor runs to kick off the pipeline.
 */
export const ingestorSchedule = ingestionConfig.get('ingestorSchedule')

if (!ingestorSchedule) {
  console.warn(
    `⚠️\tIngestor schedule is not set. Ingestor job must be run manually.`
  )
}

/**
 * The schedule for the extractor job in cron format. This determines how
 * often the extractor runs to process sanitized records.
 *
 * Schedule it after an ingestor run has finished, never at the same minute.
 * An extractor run that starts alongside an ingestor run pulls before that
 * run's records exist, so they wait for the next extraction. An ingestor run
 * and the sanitizer's burst after it finish within about five minutes; 30
 * minutes past an `ingestorSchedule` hour is a wide margin.
 */
export const extractorSchedule = ingestionConfig.get('extractorSchedule')

if (!extractorSchedule) {
  console.warn(
    `⚠️\tExtractor schedule is not set. Extractor job must be run manually.`
  )
}

/**
 * The log verbosity level for the ingestion pipeline components.
 */
export const logLevel = ingestionConfig.require('logLevel')

/**
 * The number of days to retain all logs project-wide. This should be set
 * according to the expected time it takes to identify and troubleshoot
 * issues in the pipeline, while also considering storage costs for logs.
 */
export const logRetention = ingestionConfig.requireNumber('logRetentionDays')

/**
 * The number of days to retain event logs. This should be left unset in production
 * to allow for indefinite retention, but can be set to a specific number of days in
 * non-production environments to allow for automatic cleanup of logs and reduce
 * storage costs.
 */
export const eventLogRetentionDays = ingestionConfig.getNumber(
  'eventLogRetentionDays'
)

if (eventLogRetentionDays) {
  console.warn(
    `⚠️\tEvent log retention is set to ${eventLogRetentionDays} days. This should be unset in production to allow for indefinite retention.`
  )
}

/**
 * The number of days to retain deadletter logs in the staging bucket. This should
 * unset in production to allow for indefinite retention, but can be set to a
 * specific number of days in non-production
 */
export const deadletterRetentionDays = ingestionConfig.getNumber(
  'deadletterRetentionDays'
)

if (deadletterRetentionDays) {
  console.warn(
    `⚠️\tDeadletter log retention is set to ${deadletterRetentionDays} days. This should be unset in production to allow for indefinite retention.`
  )
}

/**
 * The number of days to retain soft-deleted objects in the deadletter bucket.
 * In production, replayed events may be deleted after replay, but setting a
 * retention period for soft-deleted objects allows for a recovery period in case
 * of accidental deletion during replay.
 */

export const deadletterSoftDeleteDays = ingestionConfig.getNumber(
  'deadletterSoftDeleteDays'
)

if (!deadletterSoftDeleteDays) {
  console.warn(
    `⚠️\tDeadletter soft delete retention is unset. This should be set in production to allow for retention of soft-deleted objects.`
  )
}

/**
 * The email address that receives alert notifications for this stack. Unset
 * means no notification channel is created: the alert policies still exist
 * and their incidents show in Cloud Monitoring, but nobody is notified. Set
 * it in production; leave it unset in non-production environments, where
 * failures are routine during development.
 */
export const alertEmail = ingestionConfig.get('alertEmail')

/**
 * The age, in hours, of the oldest unacknowledged message on the extractor
 * subscription at which the backlog alert fires. The extractor runs on
 * `extractorSchedule`, so the age normally climbs until the next run and
 * then drops. The default of 24 hours is above that pattern for a 12-hour
 * schedule and fires after one fully missed or stuck run, well before
 * messages reach the subscription's 7-day retention and expire.
 */
export const extractorBacklogAlertHours =
  ingestionConfig.getNumber('extractorBacklogAlertHours') ?? 24

if (extractorBacklogAlertHours <= 0) {
  throw new Error(
    `ingestion:extractorBacklogAlertHours must be greater than 0. Got ${extractorBacklogAlertHours}.`
  )
}

/**
 * How long, in seconds, an alert incident stays open after its signal stops
 * reporting data. The dead-letter and job-failure alerts rely on this to
 * close, because their metrics only report when a failure happens. Unset
 * means 3600 (one hour). Cloud Monitoring accepts 30 minutes to 7 days.
 */
export const alertAutoCloseSeconds =
  ingestionConfig.getNumber('alertAutoCloseSeconds') ?? 3600

if (
  !Number.isInteger(alertAutoCloseSeconds) ||
  alertAutoCloseSeconds < 1800 ||
  alertAutoCloseSeconds > 604800
) {
  throw new Error(
    `ingestion:alertAutoCloseSeconds must be a whole number from 1800 (30 minutes) to 604800 (7 days). Got ${alertAutoCloseSeconds}.`
  )
}

/**
 * The age, in days, at which an object in the archive bucket moves to Nearline
 * storage. Unset means objects are never moved to Nearline.
 *
 * The archive is a permanent record that is rarely read once the pipeline has
 * processed it, so production moves it to cheaper storage classes as it ages.
 * Leave this and `archiveColdlineAfterDays` unset in non-production
 * environments to keep everything in Standard storage.
 */
export const archiveNearlineAfterDays = ingestionConfig.getNumber(
  'archiveNearlineAfterDays'
)

/**
 * The age, in days, at which an object in the archive bucket moves to Coldline
 * storage. Unset means objects are never moved to Coldline. With
 * `archiveNearlineAfterDays` unset, objects move straight from Standard.
 */
export const archiveColdlineAfterDays = ingestionConfig.getNumber(
  'archiveColdlineAfterDays'
)

// Nearline bills a minimum of 30 days of storage. An object moved on to
// Coldline sooner still pays for the rest of them.
const NEARLINE_MINIMUM_STORAGE_DAYS = 30

if (
  archiveNearlineAfterDays !== undefined &&
  archiveColdlineAfterDays !== undefined &&
  archiveColdlineAfterDays - archiveNearlineAfterDays <
    NEARLINE_MINIMUM_STORAGE_DAYS
) {
  console.warn(
    `⚠️\tArchive objects spend ${
      archiveColdlineAfterDays - archiveNearlineAfterDays
    } days in Nearline before moving to Coldline. Nearline bills a ${NEARLINE_MINIMUM_STORAGE_DAYS}-day minimum, so the unused days are still charged.`
  )
}

/**
 * Whether to force destroy storage buckets when deleting the stack. This will permanently
 * delete all data in the bucket, so it should be used with caution. It is recommended to
 * set this to true in non-production environments for easier cleanup, and false in production
 * to prevent accidental data loss.
 */
export const forceDestroyStorage =
  ingestionConfig.getBoolean('forceDestroyStorage') ?? false

if (forceDestroyStorage) {
  console.warn(
    `⚠️\tForce destroy storage is enabled. This will permanently delete all data in storage buckets when the stack is deleted. It is recommended to set this to false in production to prevent accidental data loss.`
  )
}

/**
 * Whether to retain storage buckets when deleting the stack. If set to true, storage buckets
 * will not be deleted when the stack is deleted, allowing for manual cleanup and preventing
 * accidental data loss. It is recommended to set this to true in production, and it can be
 * set to false in non-production environments for easier cleanup.
 */
export const retainStorageOnDelete =
  ingestionConfig.getBoolean('retainStorageOnDelete') ?? true

if (!retainStorageOnDelete) {
  console.warn(
    `⚠️\tRetain storage on delete is disabled. Storage buckets will be deleted when the stack is deleted, allowing for easier cleanup but increasing the risk of accidental data loss. It is recommended to set this to true in production.`
  )
}

export const ingestionLabels: Record<string, string> = {
  env: stackName,
  tag,
}
