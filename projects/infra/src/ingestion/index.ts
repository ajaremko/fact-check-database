export * from './archive'
export * from './assets'
export * from './pipeline'
import { loggingBucketConfig } from './logging'

export const loggingBucketConfigName = loggingBucketConfig.name

import { pipelineDashboard } from './monitoring'

export const pipelineDashboardId = pipelineDashboard.id

export {
  gcpProject as ingestionGcpProject,
  gcpRegion as ingestionGcpRegion,
} from './config'
