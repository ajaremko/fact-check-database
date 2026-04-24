import * as gcp from '@pulumi/gcp'

import { gcpRegion, ingestionLabels, tag } from './config'
import { storageService } from './services'
import { provider } from './provider'

export const assetsBucket = new gcp.storage.Bucket(
  `${tag}-assets-bucket`,
  {
    location: gcpRegion,
    name: `ingestor-assets`,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: true,
    labels: ingestionLabels,
  },
  {
    dependsOn: [storageService],
    provider,
  }
)

export const stagingBucket = new gcp.storage.Bucket(
  `${tag}-staging-bucket`,
  {
    location: gcpRegion,
    name: `ingestor-staging`,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: true,
    labels: ingestionLabels,
  },
  {
    dependsOn: [storageService],
    provider,
  }
)
