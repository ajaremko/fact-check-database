import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

const gcpConfig = new pulumi.Config('gcp')
export const gcpProject = gcpConfig.require('project')
export const gcpRegion = gcpConfig.require('region')

const platformConfig = new pulumi.Config('platform')
export const platformName = platformConfig.require('name')
export const kmsLocation = platformConfig.require('kmsLocation')
export const archiveLocation = platformConfig.require('archiveLocation')
export const archiveTTL = platformConfig.requireNumber('archiveTTL')
export const githubOrg = platformConfig.require('githubOrg')
export const githubRepo = platformConfig.require('githubRepo')

export const labels: Record<string, string> = {
  platform: platformName,
  env: stackName,
}
