import { websiteService } from './service'

export const websiteBackendUrl = websiteService.statuses[0].url
export const websiteBackendName = websiteService.name

import { backendBucket } from './storage'

export const backendBucketName = backendBucket.name
