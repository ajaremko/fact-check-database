import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

const ingestion = new pulumi.Config('ingestion')
export const gcpProject = ingestion.require('project')
export const gcpRegion = ingestion.require('region')
export const tag = ingestion.require('tag')

export const ingestionLabels: Record<string, string> = {
  ...labels,
  tag,
}
