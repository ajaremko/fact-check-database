import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

const githubConfig = new pulumi.Config('github_custom')
export const githubOrg = githubConfig.require('org')
export const githubRepo = githubConfig.require('repo')
