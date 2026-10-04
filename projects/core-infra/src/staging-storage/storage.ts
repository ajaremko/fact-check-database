import * as gcp from '@pulumi/gcp'

import { stagingPathPrefix } from '@fact-check-database/core-contracts/staging/v1'

import {
  gcpRegion,
  coreLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
  batchRetentionDays,
} from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const stagingStorageBucket = new gcp.storage.Bucket(
  `${tag}-staging-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: coreLabels,
    forceDestroy: forceDestroyStorage,
    // Only batch files expire. The rule is scoped to their prefix because
    // this bucket also holds the table schema file (`schemas/`), which the
    // loaders read on every load: an unscoped rule deleted it a day after
    // each deploy, and every load failed from then on.
    lifecycleRules: batchRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: {
              age: batchRetentionDays,
              matchesPrefixes: [`${stagingPathPrefix('fact_checks', 1)}/`],
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
