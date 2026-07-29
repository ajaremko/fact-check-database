import {
  liquidInformaticsBackendService,
  factCheckDatabaseBackendService,
} from './service'

export const factCheckDatabaseBackendUrl =
  factCheckDatabaseBackendService.statuses[0].url
export const factCheckDatabaseBackendName = factCheckDatabaseBackendService.name

export const liquidInformaticsBackendUrl =
  liquidInformaticsBackendService.statuses[0].url
export const liquidInformaticsBackendName = liquidInformaticsBackendService.name

import { backendBucket } from './storage'

export const backendBucketName = backendBucket.name
