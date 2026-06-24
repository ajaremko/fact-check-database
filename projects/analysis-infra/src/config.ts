import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'analysis'

const analysisConfig = new pulumi.Config('analysis')
export const gcpProject = analysisConfig.require('project')
export const gcpRegion = analysisConfig.require('region')

const coreStackName = analysisConfig.require('coreStackName')
// Format: <organization>/<project>/<stack>
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)
export const stagingStorageTopicName = coreStackRef.getOutput(
  'stagingStorageTopicName'
)

/**
 * Whether to enable deletion protection on BigQuery tables.
 * When enabled, this will prevent tables from being deleted, even if a delete
 * operation is attempted on the stack. This is a safety measure to prevent
 * accidental data loss, especially for critical datasets.
 */
export const tableDeletionProtection =
  analysisConfig.getBoolean('tableDeletionProtection') ?? true

/**
 * Whether to retain tables in the staging dataset when the stack is deleted.
 * This is a safety measure to prevent accidental data loss, as the staging
 * dataset may contain raw ingested data that has not yet been processed and
 * stored elsewhere. Setting this to false will allow tables to be deleted
 * when the stack is destroyed.
 */
export const retainTablesOnDelete =
  analysisConfig.getBoolean('retainTablesOnDelete') ?? true

/**
 * The log verbosity level for the analysis components.
 */
export const logLevel = analysisConfig.require('logLevel')

/**
 * The Docker image tag to use for all analysis components.
 * This should correspond to a tag in the container registry where the
 * analysis pipeline images are stored.
 */
export const dockerTag = analysisConfig.get('tag')

/**
 * The number of days to retain deadletter logs in the staging bucket. This should
 * unset in production to allow for indefinite retention, but can be set to a
 * specific number of days in non-production
 */
export const deadletterRetentionDays = analysisConfig.getNumber(
  'deadletterRetentionDays'
)

if (deadletterRetentionDays) {
  console.warn(
    `⚠️\tDeadletter log retention is set to ${deadletterRetentionDays} days. This should be unset in production to allow for indefinite retention.`
  )
}

/**
 * Whether to force destroy storage buckets when deleting the stack. This will permanently
 * delete all data in the bucket, so it should be used with caution. It is recommended to
 * set this to true in non-production environments for easier cleanup, and false in production
 * to prevent accidental data loss.
 */
export const forceDestroyStorage =
  analysisConfig.getBoolean('forceDestroyStorage') ?? false

if (forceDestroyStorage) {
  console.warn(
    `⚠️\tForce destroy storage is enabled. This will permanently delete all data in storage buckets when the stack is deleted. It is recommended to set this to false in production to prevent accidental data loss.`
  )
}

/**
 * The number of days to retain soft-deleted objects in the deadletter bucket.
 * In production, replayed events may be deleted after replay, but setting a
 * retention period for soft-deleted objects allows for a recovery period in case
 * of accidental deletion during replay.
 */

export const deadletterSoftDeleteDays = analysisConfig.getNumber(
  'deadletterSoftDeleteDays'
)

if (!deadletterSoftDeleteDays) {
  console.warn(
    `⚠️\tDeadletter soft delete retention is unset. This should be set in production to allow for retention of soft-deleted objects.`
  )
}

/**
 * Whether to retain storage buckets when deleting the stack. If set to true, storage buckets
 * will not be deleted when the stack is deleted, allowing for manual cleanup and preventing
 * accidental data loss. It is recommended to set this to true in production, and it can be
 * set to false in non-production environments for easier cleanup.
 */
export const retainStorageOnDelete =
  analysisConfig.getBoolean('retainStorageOnDelete') ?? true

if (!retainStorageOnDelete) {
  console.warn(
    `⚠️\tRetain storage on delete is disabled. Storage buckets will be deleted when the stack is deleted, allowing for easier cleanup but increasing the risk of accidental data loss. It is recommended to set this to true in production.`
  )
}

export const analysisLabels: Record<string, string> = {
  env: stackName,
  tag,
}
