import * as gcp from '@pulumi/gcp'

import { gcpRegion, forceDestroyStorage, retainStorageOnDelete } from '../config'
import { websiteLabels, tag } from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const backendBucket = new gcp.storage.Bucket(
  `${tag}-backend-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: websiteLabels,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)
