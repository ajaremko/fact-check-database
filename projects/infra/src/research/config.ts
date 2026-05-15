import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'research'

const researchConfig = new pulumi.Config('research')
export const gcpProject = researchConfig.require('project')
export const gcpRegion = researchConfig.require('region')
export const tableDeletionProtection =
  researchConfig.getBoolean('tableDeletionProtection') ?? true

export const researchLabels: Record<string, string> = {
  ...labels,
  tag,
}
