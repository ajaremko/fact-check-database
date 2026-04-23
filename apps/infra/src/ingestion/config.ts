import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'ingestion'

const ingestionConfig = new pulumi.Config('ingestion')
export const gcpProject = ingestionConfig.require('project')
export const gcpRegion = ingestionConfig.require('region')
export const dockerTag = ingestionConfig.get('tag')
export const ingestorSchedule = ingestionConfig.require('ingestorSchedule')
export const extractorSchedule = ingestionConfig.require('extractorSchedule')
export const logLevel = ingestionConfig.require('logLevel')
export const logRetention = ingestionConfig.requireNumber('logRetentionDays')
const deadletterRetention = ingestionConfig.requireNumber(
  'deadletterRetentionDays'
)
export const deadletterRetentionDuration = `${
  deadletterRetention * 24 * 60 * 60
}s` // Convert days to seconds

export const ingestionLabels: Record<string, string> = {
  ...labels,
  tag,
}
