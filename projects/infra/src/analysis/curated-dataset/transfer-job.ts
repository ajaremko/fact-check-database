import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { provider } from '../project'
import { stagingTableRef } from '../staging-dataset'
import { tag } from '../config'

import { curatedTableRef } from './bigquery'

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
            
            fetched_at,
            extracted_at,
            
            extractor_id,
            extractor_version,
            
            source.url,
            http.final_url,
            fact_check.canonical_url,
            
            fact_check.title,
            fact_check.claim,
            fact_check.summary,
            
            fact_check.verdict_raw as raw_verdict,
            fact_check.verdict_normalized as verdict,
            
            fact_check.language,
            
            fact_check.published_at_raw as raw_published_at,
            fact_check.published_at_normalized as published_at,
            
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
          raw_verdict,
          verdict,
          language,
          raw_published_at,
          published_at,
          fetched_at,
          extracted_at,
          extractor_version,
          extractor_id
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
          S.raw_verdict,
          S.verdict,
          S.language,
          S.raw_published_at,
          S.published_at,
          S.fetched_at,
          S.extracted_at,
          S.extractor_version,
          S.extractor_id
        )`,
    },
  },
  { provider }
)
