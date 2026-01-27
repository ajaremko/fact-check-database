import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

const shared = new pulumi.Config('shared')
export const gcpProject = shared.require('project')
export const gcpRegion = shared.require('region')
export const tag = shared.require('tag')
export const kmsLocation = shared.require('kmsLocation')
export const archiveLocation = shared.require('archiveLocation')
export const archiveTTL = shared.requireNumber('archiveTTL')
export const githubOrg = shared.require('githubOrg')
export const githubRepo = shared.require('githubRepo')

export const sharedLabels: Record<string, string> = {
  ...labels,
  tag,
}
