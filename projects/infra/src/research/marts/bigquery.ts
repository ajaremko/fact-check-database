import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tableDeletionProtection, tag } from '../config'
import { provider } from '../provider'

import { curatedTableRef } from '../curated'

export const martsDataset = new gcp.bigquery.Dataset(
  `${tag}-marts-dataset`,
  {
    datasetId: 'marts',
    friendlyName: 'Marts Dataset',
    description: 'Marts for final research data',
    location: 'US',
  },
  { provider }
)

export const martsDatasetId = martsDataset.datasetId

export const martsFactChecksTable = new gcp.bigquery.Table(
  `${tag}-marts-fact-checks-table`,
  {
    datasetId: martsDataset.datasetId,
    tableId: 'fact_checks',
    deletionProtection: tableDeletionProtection,
    view: {
      useLegacySql: false,
      query: pulumi.interpolate`
        SELECT
          fact_check_id,
          source_name,
          collection,
          raw_published_at,
          published_at,
          title,
          claim,
          summary,
          raw_verdict,
          verdict,
          language,
          canonical_url
        FROM \`${curatedTableRef}\`
        WHERE claim IS NOT NULL
      `,
    },
  },
  { provider }
)
