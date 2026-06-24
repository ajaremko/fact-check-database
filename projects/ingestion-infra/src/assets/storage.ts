import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  gcpRegion,
  ingestionLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
} from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const assetsBucket = new gcp.storage.Bucket(
  `${tag}-assets-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: ingestionLabels,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)

export const ingestionSourcesObject = new gcp.storage.BucketObject(
  `${tag}-ingestion-sources-asset`,
  {
    bucket: assetsBucket.name,
    name: 'ingestion-sources.csv',
    source: new pulumi.asset.FileAsset('assets/ingestion-sources.csv'),
    contentType: 'text/csv',
  },
  { provider }
)

export const sanitizerPolicyObject = new gcp.storage.BucketObject(
  `${tag}-sanitizer-policy-asset`,
  {
    bucket: assetsBucket.name,
    name: 'sanitizer-policy.yml',
    source: new pulumi.asset.FileAsset('assets/sanitizer-policy.yml'),
    contentType: 'application/yaml',
  },
  { provider }
)
