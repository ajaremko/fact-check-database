export * from './archive'
export * from './assets'
export * from './data-transfer'
export * from './pipeline'
import { loggingBucketConfig } from './logging'

export const loggingBucketConfigName = loggingBucketConfig.name

import { pipelineDashboard } from './monitoring'

export const pipelineDashboardId = pipelineDashboard.id
