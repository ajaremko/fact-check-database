import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'analysis'

const analysisConfig = new pulumi.Config('analysis')
export const gcpProject = analysisConfig.require('project')
export const gcpRegion = analysisConfig.require('region')
export const tableDeletionProtection =
  analysisConfig.getBoolean('tableDeletionProtection') ?? true
export const retainTablesOnDelete =
  analysisConfig.getBoolean('retainTablesOnDelete') ?? true

export const analysisLabels: Record<string, string> = {
  ...labels,
  tag,
}
