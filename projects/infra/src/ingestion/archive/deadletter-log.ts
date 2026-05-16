import * as gcp from '@pulumi/gcp'

import {
  deadletterRetentionDays,
  forceDestroyStorage,
  gcpRegion,
  retainStorageOnDelete,
} from '../config'
import { ingestionLabels, tag } from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const deadletterBucket = new gcp.storage.Bucket(
  `${tag}-deadletter-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: ingestionLabels,
    lifecycleRules: deadletterRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: { age: deadletterRetentionDays },
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
