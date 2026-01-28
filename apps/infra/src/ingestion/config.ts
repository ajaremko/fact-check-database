import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

const ingestionConfig = new pulumi.Config('ingestion')
export const gcpProject = ingestionConfig.require('project')
export const gcpRegion = ingestionConfig.require('region')
export const tag = ingestionConfig.require('tag')

export const ingestionLabels: Record<string, string> = {
  ...labels,
  tag,
}
