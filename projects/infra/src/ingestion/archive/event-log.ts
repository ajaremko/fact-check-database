import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  ingestionLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
  eventLogRetentionDays,
} from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const eventLogBucket = new gcp.storage.Bucket(
  `${tag}-event-log-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: forceDestroyStorage,
    lifecycleRules: eventLogRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: {
              matchesPrefixes: ['sanitizer-events/', 'extractor-events/'],
              age: eventLogRetentionDays,
            },
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
