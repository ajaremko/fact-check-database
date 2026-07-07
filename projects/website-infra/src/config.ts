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
 * The log verbosity level for the ingestion pipeline components.
 */
export const logLevel = websiteConfig.require('logLevel')

/**
 * A list of domains that have been verified for use with the website.
 * These domains can be used for domain mapping in Cloud Run.
 */
export const verifiedDomains =
  websiteConfig.requireObject<string[]>('verifiedDomains')

export const mainDomain = verifiedDomains[0]

if (!mainDomain) {
  throw new Error(
    'At least one verified domain must be provided in the configuration.'
  )
}

/**
 * The email address of the verified owner of the website. This should be the
 * email address associated with the Google account that has ownership of the
 * verified domains.
 */
export const verifiedOwnerEmail = websiteConfig.require('verifiedOwner')

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
