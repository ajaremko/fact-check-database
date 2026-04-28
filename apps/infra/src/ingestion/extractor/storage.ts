import * as gcp from '@pulumi/gcp'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { stagingFactChecksSchema } from '../bigquery'

export const stagingFactChecksSchemaObject = new gcp.storage.BucketObject(
  `${tag}-staging-fact-checks-schema-json`,
  {
    bucket: assetsBucket.name,
    name: 'staging-fact-checks-schema.json',
    content: JSON.stringify(stagingFactChecksSchema),
    contentType: 'application/json',
  },
  { provider }
)
