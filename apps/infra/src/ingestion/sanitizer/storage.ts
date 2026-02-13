import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'

export const policiesObject = new gcp.storage.BucketObject(
  `${tag}-policies-yml`,
  {
    bucket: assetsBucket.name,
    name: 'policies.yml',
    source: new pulumi.asset.FileAsset('ingestion/sanitizer/policies.yml'),
    contentType: 'application/yaml',
  },
  { provider }
)
