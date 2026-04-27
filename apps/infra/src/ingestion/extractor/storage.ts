import * as gcp from '@pulumi/gcp'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { factChecksSchema } from '../big-query'

export const factChecksSchemaObject = new gcp.storage.BucketObject(
  `${tag}-fact-checks-schema-json`,
  {
    bucket: assetsBucket.name,
    name: 'fact-checks-schema.json',
    content: JSON.stringify(factChecksSchema),
    contentType: 'application/json',
  },
  { provider }
)
