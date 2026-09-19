import { factCheckDatabaseBackendService } from './service'

export const factCheckDatabaseBackendUrl =
  factCheckDatabaseBackendService.statuses[0].url
export const factCheckDatabaseBackendName = factCheckDatabaseBackendService.name

import { backendBucket } from './storage'

export const backendBucketName = backendBucket.name
