import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { provider } from '../../project'
import { stagingTableRef } from '../../staging-dataset'
import {
  curatedTransferSchedule,
  curatedTransferStartTime,
  tag,
} from '../../config'

import { curatedTableRef } from '../bigquery'

import {
  curatedLoaderServiceAccount,
  bigQueryDataTransferTokenCreator,
} from './service-account'

export const stagingToCuratedTransferJob = new gcp.bigquery.DataTransferConfig(
  `${tag}-staging-transfer-job`,
  {
    displayName: 'Curated Fact Checks Transfer Job',
    serviceAccountName: curatedLoaderServiceAccount.email,
    dataSourceId: 'scheduled_query',
    location: 'US',
    // Both come from stack config. The start time anchors the schedule to
    // shortly after `ingestion-infra`'s extractor runs, so each extraction's
    // rows are merged soon after they load. The runs in between find nothing
    // new and serve as catch-up.
    schedule: curatedTransferSchedule,
    scheduleOptions: curatedTransferStartTime
      ? { startTime: curatedTransferStartTime }
      : undefined,
    params: {
      // Staging is an append-only observation log: the same fact check
      // appears once per fetch that listed it. This MERGE collapses those
      // observations into one curated row per `fact_check_id` (computed by the
      // extractor; see docs/fact-check-lifecycle.md). The latest observation (by
      // `fetched_at`) wins, both within a run and against rows already
      // curated; a row is only updated when its content version
      // (`fact_check_sha256`) differs, so an unchanged re-fetch is a no-op.
      //
      // The window matches the staging partition expiry (7 days). The MERGE
      // is idempotent, so overlapping windows are harmless and a missed run
      // is caught up by the next one.
      query: pulumi.interpolate`
        MERGE \`${curatedTableRef}\` T
        USING (
          SELECT
            fact_check_id,
            fact_check.sha256 AS fact_check_sha256,
            content_sha256,

            source.id AS source_id,
            source.name AS source_name,
            source.collection,

            fetched_at,
            extracted_at,

            extractor_id,
            extractor_version,
            sanitizer_policy_version,

            source.url,
            http.final_url,
            fact_check.canonical_url,

            fact_check.title,
            fact_check.summary,

            fact_check.language,

            fact_check.published_at_raw AS raw_published_at,
            fact_check.published_at_normalized AS published_at,

          FROM \`${stagingTableRef}\`
          WHERE extracted_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          QUALIFY ROW_NUMBER() OVER (
            PARTITION BY fact_check_id
            ORDER BY fetched_at DESC, extracted_at DESC
          ) = 1
        ) S
        ON T.fact_check_id = S.fact_check_id
        WHEN MATCHED
          AND S.fact_check_sha256 != T.fact_check_sha256
          AND S.fetched_at > T.fetched_at
        THEN UPDATE SET
          fact_check_sha256 = S.fact_check_sha256,
          content_sha256 = S.content_sha256,
          source_name = S.source_name,
          collection = S.collection,
          url = S.url,
          final_url = S.final_url,
          canonical_url = S.canonical_url,
          title = S.title,
          summary = S.summary,
          language = S.language,
          raw_published_at = S.raw_published_at,
          published_at = S.published_at,
          fetched_at = S.fetched_at,
          extracted_at = S.extracted_at,
          extractor_version = S.extractor_version,
          extractor_id = S.extractor_id,
          sanitizer_policy_version = S.sanitizer_policy_version
        WHEN NOT MATCHED THEN
        INSERT (
          fact_check_id,
          fact_check_sha256,
          content_sha256,
          source_id,
          source_name,
          collection,
          url,
          final_url,
          canonical_url,
          title,
          summary,
          language,
          raw_published_at,
          published_at,
          fetched_at,
          extracted_at,
          extractor_version,
          extractor_id,
          sanitizer_policy_version
        )
        VALUES (
          S.fact_check_id,
          S.fact_check_sha256,
          S.content_sha256,
          S.source_id,
          S.source_name,
          S.collection,
          S.url,
          S.final_url,
          S.canonical_url,
          S.title,
          S.summary,
          S.language,
          S.raw_published_at,
          S.published_at,
          S.fetched_at,
          S.extracted_at,
          S.extractor_version,
          S.extractor_id,
          S.sanitizer_policy_version
        )`,
    },
  },
  { provider, dependsOn: [bigQueryDataTransferTokenCreator] }
)
