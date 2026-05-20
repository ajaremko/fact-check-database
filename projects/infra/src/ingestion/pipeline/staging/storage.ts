import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  ingestionLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
  batchRetentionDays,
} from '../../config'
import { storageService } from '../../services'
import { provider } from '../../project'

export const stagingBucket = new gcp.storage.Bucket(
  `${tag}-staging-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: forceDestroyStorage,
    lifecycleRules: batchRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: { age: batchRetentionDays },
          },
        ]
      : undefined,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)
