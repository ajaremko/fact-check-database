export * from './archive'
export * from './assets'
export * from './extractor'
export * from './ingestor'
export * from './sanitizer'
import { loggingBucketConfig } from './logging'

export const loggingBucketConfigName = loggingBucketConfig.name

import { pipelineDashboard } from './dashboard'

export const pipelineDashboardId = pipelineDashboard.id

export {
  gcpProject as ingestionGcpProject,
  gcpRegion as ingestionGcpRegion,
} from './config'
