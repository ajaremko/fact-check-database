import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { FactChecksTableSchema } from '@news-research/ingestion-core/pipeline/extract/contracts/v1'

import { tag, ingestionLabels, gcpProject } from './config'
import { provider } from './provider'

export const stagingDataset = new gcp.bigquery.Dataset(
  `${tag}-staging-dataset`,
  {
    datasetId: 'staging',
    friendlyName: 'Staging Dataset',
    description: 'Dataset for staging extracted data',
    location: 'US', // Regional location for data storage
  },
  { provider }
)

export const stagingDatasetId = stagingDataset.datasetId

export const stagingFactChecksTable = new gcp.bigquery.Table(
  `${tag}-staging-fact-checks-table`,
  {
    datasetId: stagingDataset.datasetId,
    tableId: 'fact-checks',
    deletionProtection: false,
    schema: JSON.stringify(FactChecksTableSchema.fields),
    timePartitioning: {
      type: 'DAY',
      field: 'extracted_at',
      expirationMs: 7 * 1000 * 60 * 60 * 24, // 7 days in milliseconds
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const stagingFactChecksTableId = stagingFactChecksTable.tableId

export const curatedDataset = new gcp.bigquery.Dataset(
  `${tag}-curated-dataset`,
  {
    datasetId: 'curated',
    friendlyName: 'Curated Dataset',
    description: 'Dataset for curated data from staging',
    location: 'US',
  },
  { provider }
)

export const curatedDatasetId = curatedDataset.datasetId

export const curatedFactChecksTable = new gcp.bigquery.Table(
  `${tag}-curated-fact-checks-table`,
  {
    datasetId: curatedDataset.datasetId,
    tableId: 'fact-checks',
    deletionProtection: false,
    schema: JSON.stringify([
      { name: 'fact_check_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'content_lineage_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
      { name: 'url', type: 'STRING', mode: 'REQUIRED' },
      { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'title', type: 'STRING', mode: 'NULLABLE' },
      { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
      { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
      { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
      { name: 'verdict_raw', type: 'STRING', mode: 'NULLABLE' },
      { name: 'language', type: 'STRING', mode: 'NULLABLE' },
      { name: 'published_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'published_at_raw', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extractor_version', type: 'STRING', mode: 'NULLABLE' },
      { name: 'http_status_code', type: 'INTEGER', mode: 'NULLABLE' },
    ]),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const curatedFactChecksTableId = curatedFactChecksTable.tableId

const curatedTableRef = pulumi.interpolate`${gcpProject}.${curatedDataset.datasetId}.${curatedFactChecksTable.tableId}`
const stagingTableRef = pulumi.interpolate`${gcpProject}.${stagingDataset.datasetId}.${stagingFactChecksTable.tableId}`

export const stagingToCuratedTransferJob = new gcp.bigquery.DataTransferConfig(
  `${tag}-staging-to-curated-transfer-job`,
  {
    displayName: 'Curated Fact Checks Transfer Job',
    dataSourceId: 'scheduled_query',
    location: 'US',
    schedule: 'every 6 hours',
    params: {
      query: pulumi.interpolate`
        MERGE \`${curatedTableRef}\` T
        USING (
          SELECT
            TO_HEX(SHA256(CONCAT(
              source.id,
              IFNULL(fact_check.canonical_url, source.url),
              IFNULL(fact_check.claim, '')
            ))) AS fact_check_id,
            
            content_lineage_id,
            content_sha256,
            
            source.id AS source_id,
            source.name AS source_name,
            source.collection,
            
            source.url,
            http.final_url,
            fact_check.canonical_url,
            
            fact_check.title,
            fact_check.claim,
            fact_check.summary,
            
            fact_check.verdict AS verdict_raw,
            fact_check.normalized_verdict,
            
            fact_check.language,
            
            fact_check.published_at,
            
            fetched_at,
            extracted_at,
            
            fact_check.extractor_version,
            
            http.status_code AS http_status_code
            
          FROM \`${stagingTableRef}\`
          WHERE extracted_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
        ) S
        ON T.fact_check_id = S.fact_check_id
        WHEN NOT MATCHED THEN
        INSERT (
          fact_check_id,
          content_lineage_id,
          content_sha256,
          source_id,
          source_name,
          collection,
          url,
          final_url,
          canonical_url,
          title,
          claim,
          summary,
          verdict_raw,
          normalized_verdict,
          language,
          published_at,
          fetched_at,
          extracted_at,
          extractor_version,
          http_status_code
        )
        VALUES (
          S.fact_check_id,
          S.content_lineage_id,
          S.content_sha256,
          S.source_id,
          S.source_name,
          S.collection,
          S.url,
          S.final_url,
          S.canonical_url,
          S.title,
          S.claim,
          S.summary,
          S.verdict_raw,
          S.normalized_verdict,
          S.language,
          S.published_at,
          S.fetched_at,
          S.extracted_at,
          S.extractor_version,
          S.http_status_code
        )`,
    },
  },
  { provider }
)
