import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'

export const targetsObject = new gcp.storage.BucketObject(
  `${tag}-ingestor-targets-csv`,
  {
    bucket: assetsBucket.name,
    name: 'target-list.csv',
    source: new pulumi.asset.FileAsset('ingestion/ingestor/target-list.csv'),
    contentType: 'text/csv',
  },
  { provider }
)
