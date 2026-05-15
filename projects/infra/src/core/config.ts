import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'core'

const coreConfig = new pulumi.Config('core')
export const gcpProject = coreConfig.require('project')
export const gcpRegion = coreConfig.require('region')
export const kmsLocation = coreConfig.require('kmsLocation')
export const githubOrg = coreConfig.require('githubOrg')
export const githubRepo = coreConfig.require('githubRepo')
export const workloadIdentityPoolId = coreConfig.require(
  'workloadIdentityPoolId'
)

export const coreLabels: Record<string, string> = {
  ...labels,
  tag,
}
