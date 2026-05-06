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
    lifecycleRules: [
      {
        action: { type: 'Delete' },
        condition: { age: 2 },
      },
    ],
  },
  {
    dependsOn: [storageService],
    provider,
  }
)

export const eventLogBucket = new gcp.storage.Bucket(
  `${tag}-event-log-bucket`,
  {
    location: gcpRegion,
    name: 'ingestion-event-logs',
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    lifecycleRules: [
      {
        action: { type: 'Delete' },
        condition: {
          matchesPrefixes: ['sanitizer-events/', 'extractor-events/'],
          age: 7,
        },
      },
    ],
  },
  {
    dependsOn: [storageService],
    provider,
  }
)

export const dataflowBucket = new gcp.storage.Bucket(
  `${tag}-dataflow-bucket`,
  {
    location: gcpRegion,
    name: 'ingestion-dataflow-tmp',
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: true,
    labels: ingestionLabels,
    lifecycleRules: [
      {
        action: { type: 'Delete' },
        condition: { age: 1 },
      },
    ],
  },
  {
    dependsOn: [storageService],
    provider,
  }
)
