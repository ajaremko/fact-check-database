import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

const gcpConfig = new pulumi.Config('gcp')
export const gcpProject = gcpConfig.require('project')
export const gcpRegion = gcpConfig.require('region')

const platformConfig = new pulumi.Config('platform')
export const kmsLocation = platformConfig.require('kmsLocation')
export const githubOrg = platformConfig.require('githubOrg')
export const githubRepo = platformConfig.require('githubRepo')
