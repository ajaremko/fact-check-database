import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'core'

const coreConfig = new pulumi.Config('core')
export const gcpProject = coreConfig.require('project')
export const gcpRegion = coreConfig.require('region')
export const kmsLocation = coreConfig.require('kmsLocation')

/**
 * The Cloud KMS location of the key that encrypts BigQuery data. BigQuery
 * only accepts a key in the same location as the dataset it encrypts, and the
 * analysis datasets are in the `US` multi-region, so this defaults to the
 * matching KMS multi-region, `us`. It is separate from `kmsLocation`, which
 * places the archive bucket's key beside its regional bucket.
 */
export const bigQueryKmsLocation = coreConfig.get('bigQueryKmsLocation') ?? 'us'
export const githubOrg = coreConfig.require('githubOrg')
export const githubRepo = coreConfig.require('githubRepo')
export const workloadIdentityPoolId = coreConfig.require(
  'workloadIdentityPoolId'
)

/**
 * The number of days to retain extractor batch data. The loader component
 * should process all data in the staging bucket within this time frame
 * to ensure data is not deleted before it can be loaded into BigQuery.
 */
export const batchRetentionDays = coreConfig.requireNumber('batchRetentionDays')

/**
 * Whether to force destroy storage buckets when deleting the stack. This will permanently
 * delete all data in the bucket, so it should be used with caution. It is recommended to
 * set this to true in non-production environments for easier cleanup, and false in production
 * to prevent accidental data loss.
 */
export const forceDestroyStorage =
  coreConfig.getBoolean('forceDestroyStorage') ?? false

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
  coreConfig.getBoolean('retainStorageOnDelete') ?? true

if (!retainStorageOnDelete) {
  console.warn(
    `⚠️\tRetain storage on delete is disabled. Storage buckets will be deleted when the stack is deleted, allowing for easier cleanup but increasing the risk of accidental data loss. It is recommended to set this to true in production.`
  )
}

export const coreLabels: Record<string, string> = {
  env: stackName,
  tag,
}
