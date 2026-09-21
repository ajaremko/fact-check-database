import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'website'

const websiteConfig = new pulumi.Config('website')
export const gcpProject = websiteConfig.require('project')
export const gcpRegion = websiteConfig.require('region')

const coreStackName = websiteConfig.require('coreStackName')
// Format: <organization>/<project>/<stack>
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)

export const coreProject = coreStackRef.getOutput('gcpProject')
export const coreRegion = coreStackRef.getOutput('gcpRegion')

export const stagingStorageBucketName = coreStackRef.getOutput(
  'stagingStorageBucketName'
)
export const stagingStorageTopicName = coreStackRef.getOutput(
  'stagingStorageTopicName'
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

/**
 * The Docker image tag to use for all website components.
 * This should correspond to a tag in the container registry where the
 * website images are stored.
 */
export const dockerTag = websiteConfig.get('tag')

/**
 * The number of days to retain deadletter logs in the staging bucket. This should
 * unset in production to allow for indefinite retention, but can be set to a
 * specific number of days in non-production
 */
export const deadletterRetentionDays = websiteConfig.getNumber(
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
  websiteConfig.getBoolean('forceDestroyStorage') ?? false

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

export const deadletterSoftDeleteDays = websiteConfig.getNumber(
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
  websiteConfig.getBoolean('retainStorageOnDelete') ?? true

if (!retainStorageOnDelete) {
  console.warn(
    `⚠️\tRetain storage on delete is disabled. Storage buckets will be deleted when the stack is deleted, allowing for easier cleanup but increasing the risk of accidental data loss. It is recommended to set this to true in production.`
  )
}

/**
 * The log verbosity level for the ingestion pipeline components.
 */
export const logLevel = websiteConfig.require('logLevel')

/**
 * A list of domains that have been verified for use with the website.
 * These domains can be used for domain mapping in Cloud Run.
 */
export const verifiedDomains =
  websiteConfig.requireObject<string[]>('verifiedDomains')

export const [mainDomain] = verifiedDomains

if (!mainDomain) {
  throw new Error(
    'At least one verified domain must be provided in the configuration.'
  )
}

export const websiteLabels: Record<string, string> = {
  env: stackName,
  tag,
}

/**
 * Algolia configuration for the website's search functionality. These values should
 * correspond to the Algolia application and index that are set up for the website's
 * fact check search feature.
 */
export const algoliaAppId = websiteConfig.require('algoliaAppId')
export const algoliaSearchKey = websiteConfig.require('algoliaSearchKey')

/**
 * Google Analytics measurement ID for the public site. Optional and unset for dev on purpose —
 * dev/test traffic should never reach real analytics. When unset, the frontend renders no
 * analytics script at all.
 */
export const gaMeasurementId = websiteConfig.get('gaMeasurementId')

/**
 * Resend configuration for the website's email sending functionality. The API key secret
 * version should correspond to the version of the Resend API key stored in Secret Manager,
 * and the confirmation template ID should correspond to the email template set up in
 * Resend for sending confirmation emails to users.
 */
export const resendApiKeySecretVersion = websiteConfig.get(
  'resendApiKeySecretVersion'
)

if (!resendApiKeySecretVersion) {
  console.warn(
    'No Resend API key secret version specified. The emailer service may fail to start without this configuration.'
  )
}

export const resendConfirmationTemplateId = websiteConfig.require(
  'resendConfirmationTemplateId'
)
export const adminEmail = websiteConfig.require('adminEmail')

export const htpasswdSecretVersion = websiteConfig.get('htpasswdSecretVersion')

if (!htpasswdSecretVersion && stackName === 'dev') {
  console.warn(
    'No htpasswd secret version specified. The website service may fail to start without this configuration.'
  )
}

if (htpasswdSecretVersion && stackName === 'prod') {
  throw new Error(
    'htpasswd secret version is specified in production config. This value should be removed from the configuration.'
  )
}
