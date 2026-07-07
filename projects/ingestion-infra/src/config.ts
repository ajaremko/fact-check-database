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
 * The GCP region where the archive storage bucket using CMEK will be created. This should
 * be the region where the encryption key is deployed.
 */
export const archiveLocation = ingestionConfig.require('archiveLocation')

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
export const ingestorSchedule = ingestionConfig.require('ingestorSchedule')

/**
 * The schedule for the extractor job in cron format. This determines how
 * often the extractor runs to process sanitized records.
 */
export const extractorSchedule = ingestionConfig.require('extractorSchedule')

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
 * The number of days to retain extractor batch data. The loader component
 * should process all data in the staging bucket within this time frame
 * to ensure data is not deleted before it can be loaded into BigQuery.
 */
export const batchRetentionDays =
  ingestionConfig.requireNumber('batchRetentionDays')

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
