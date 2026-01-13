import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

const gcpConfig = new pulumi.Config('gcp')
export const gcpProject = gcpConfig.require('project')
export const gcpLocation = gcpConfig.require('location')

const githubConfig = new pulumi.Config('github_custom')
export const githubOrg = githubConfig.require('org')
export const githubRepo = githubConfig.require('repo')
