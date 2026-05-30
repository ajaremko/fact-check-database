import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'website'

const websiteConfig = new pulumi.Config('website')
export const gcpProject = websiteConfig.require('project')
export const gcpRegion = websiteConfig.require('region')

/**
 * The Docker image tag to use for all website components.
 * This should correspond to a tag in the container registry where the
 * website images are stored.
 */
export const dockerTag = websiteConfig.get('tag')

/**
 * A list of domains that have been verified for use with the website.
 * These domains can be used for domain mapping in Cloud Run.
 */
export const verifiedDomains =
  websiteConfig.requireObject<string[]>('verifiedDomains')

/**
 * The email address of the verified owner of the website. This should be the
 * email address associated with the Google account that has ownership of the
 * verified domains.
 */
export const verifiedOwnerEmail = websiteConfig.require('verifiedOwner')

export const websiteLabels: Record<string, string> = {
  ...labels,
  tag,
}
