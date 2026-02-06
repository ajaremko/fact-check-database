import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

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
    labels: ingestionLabels,
  },
  {
    dependsOn: [storageService],
    provider,
  }
)

export const targetsObject = new gcp.storage.BucketObject(
  `${tag}-targets-csv`,
  {
    bucket: assetsBucket.name,
    name: 'target-list.csv',
    source: new pulumi.asset.FileAsset('ingestion/target-list.csv'),
    contentType: 'text/csv',
  },
  { provider }
)
