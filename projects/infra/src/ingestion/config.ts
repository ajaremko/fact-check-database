import * as pulumi from '@pulumi/pulumi'

import { labels } from '../config'

export const tag = 'ingestion'

const ingestionConfig = new pulumi.Config('ingestion')

/**
 * The GCP project where all ingestion resources will be created.
 */
export const gcpProject = ingestionConfig.require('project')

/**
 * The GCP region where resources will be created. This should be the same region as the
 * one used for the analysis datasets to optimize performance and reduce costs.
 */
export const gcpRegion = ingestionConfig.require('region')

/**
 * The GCP region where the archive storage bucket using CMEK will be created. This should
 * be the region where the encryption key is deployed.
 */
export const archiveLocation = ingestionConfig.require('archiveLocation')

/**
 * The Docker image tag to use for all ingestion pipeline components.
 * This should correspond to a tag in the container registry where the
 * ingestion pipeline images are stored.
 */
export const dockerTag = ingestionConfig.get('tag')

/**
 * The schedule for the ingestor job in cron format. This determines how
 * often the ingestor runs to kick off the pipeline.
 */
export const ingestorSchedule = ingestionConfig.require('ingestorSchedule')

/**
 * The schedule for the extractor job in cron format. This determines how
 * often the extractor runs to process sanitized records.
 */
export const extractorSchedule = ingestionConfig.require('extractorSchedule')

/**
 * The log verbosity level for the ingestion pipeline components.
 */
export const logLevel = ingestionConfig.require('logLevel')

/**
 * The number of days to retain all logs project-wide. This should be set
 * according to the expected time it takes to identify and troubleshoot
 * issues in the pipeline, while also considering storage costs for logs.
 */
export const logRetention = ingestionConfig.requireNumber('logRetentionDays')

/**
 * The number of days to retain extractor batch data. The loader component
 * should process all data in the staging bucket within this time frame
 * to ensure data is not deleted before it can be loaded into BigQuery.
 */
export const batchRetentionDays =
  ingestionConfig.requireNumber('batchRetentionDays')

export const eventLogRetentionDays = ingestionConfig.getNumber(
  'eventLogRetentionDays'
)

export const deadletterRetentionDays = ingestionConfig.getNumber(
  'deadletterRetentionDays'
)

export const forceDestroyStorage =
  ingestionConfig.getBoolean('forceDestroyStorage') ?? false

export const retainStorageOnDelete =
  ingestionConfig.getBoolean('retainStorageOnDelete') ?? true

export const ingestionLabels: Record<string, string> = {
  ...labels,
  tag,
}
