import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'

export const policyObject = new gcp.storage.BucketObject(
  `${tag}-policy-yml`,
  {
    bucket: assetsBucket.name,
    name: 'policy.yml',
    source: new pulumi.asset.FileAsset('ingestion/sanitizer/policy.yml'),
    contentType: 'application/yaml',
  },
  { provider }
)
