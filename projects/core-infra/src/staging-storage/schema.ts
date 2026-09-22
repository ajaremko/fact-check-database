import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { FactChecksTableDBSchema } from '@fact-check-database/core-contracts/staging/v1'

import { tag } from '../config'
import { provider } from '../project'

import { stagingStorageBucket } from './storage'

export const factChecksTableDBSchemaObject = new gcp.storage.BucketObject(
  `${tag}-staging-fact-checks-table-schema`,
  {
    bucket: stagingStorageBucket.name,
    name: 'schemas/fact_checks_table_schema_v1.json',
    source: new pulumi.asset.StringAsset(
      JSON.stringify(FactChecksTableDBSchema)
    ),
    contentType: 'application/json',
  },
  { provider }
)

export const factChecksTableDBSchemaObjectUri = pulumi.interpolate`gs://${stagingStorageBucket.name}/${factChecksTableDBSchemaObject.name}`
