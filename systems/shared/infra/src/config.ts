import * as pulumi from '@pulumi/pulumi'

const githubConfig = new pulumi.Config('github')
export const githubOrg = githubConfig.require('org')
export const githubRepo = githubConfig.require('repo')
