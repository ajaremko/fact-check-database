import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  forceDestroyStorage,
  retainStorageOnDelete,
  deadletterRetentionDays,
  deadletterSoftDeleteDays,
} from '../config'
import { websiteLabels, tag } from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const deadletterBucket = new gcp.storage.Bucket(
  `${tag}-deadletter-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: websiteLabels,
    softDeletePolicy: deadletterSoftDeleteDays
      ? {
          retentionDurationSeconds: deadletterSoftDeleteDays * 24 * 60 * 60,
        }
      : undefined,
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
