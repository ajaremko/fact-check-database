import * as gcp from '@pulumi/gcp'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { claimsSchema } from '../big-query'

export const claimsSchemaObject = new gcp.storage.BucketObject(
  `${tag}-claims-schema-json`,
  {
    bucket: assetsBucket.name,
    name: 'claims-schema.json',
    content: JSON.stringify(claimsSchema),
    contentType: 'application/json',
  },
  { provider }
)
