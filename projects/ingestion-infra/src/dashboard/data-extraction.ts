import { gcpProject } from '../config'

import {
  ExtractionBatchWrittenKey,
  ExtractionSucceededKey,
  ExtractionFailedKey,
  ExtractionJobCompletedKey,
} from '@fact-check-database/ingestion-contracts/logging/v1'

const timezone = 'America/Los_Angeles'

const tabGroup = {
  title: 'Data Extraction',
  singleViewGroup: { displayType: 'TAB' },
}

const extractorJobRunsWidget = {
  title: 'Job Runs',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}') AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload.serviceContext.version) AS Version,
                INT64(json_payload['job.tasks']) AS Records,
                INT64(json_payload['job.failures']) AS Failures,
                INT64(json_payload['job.rowsExtracted']) AS \`Rows Extracted\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND JSON_VALUE(json_payload, '$.event') = '${ExtractionJobCompletedKey}'
              ORDER BY timestamp DESC
              LIMIT 50`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const extractionResultsWidget = {
  title: 'Extraction Results',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload['source.name'])       AS Source,
                STRING(json_payload['source.id'])         AS \`Source ID\`,
                STRING(json_payload['source.collection']) AS Collection,
                INT64(json_payload['count'])              AS \`Fact Checks\`,
                STRING(json_payload['extractor.id'])      AS \`Extractor Id\`,
                INT64(json_payload['extractor.version'])  AS \`Extractor Version\`,
                STRING(json_payload['job.runId'])         AS \`Run ID\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND severity = 'INFO'
                AND JSON_VALUE(json_payload, '$.event') = '${ExtractionSucceededKey}'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const extractionErrorsWidget = {
  title: 'Extraction Errors',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload['extractor.id'])      AS Extractor,
                INT64(json_payload['extractor.version'])  AS Version,
                STRING(json_payload['type'])              AS \`Error Type\`,
                STRING(json_payload['error'])             AS Error,
                STRING(json_payload['source.id'])         AS \`Source ID\`,
                STRING(json_payload['source.name'])       AS Source,
                STRING(json_payload['source.collection']) AS Collection,
                STRING(json_payload['job.runId'])         AS \`Run ID\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND severity = 'WARNING'
                AND JSON_VALUE(json_payload, '$.event') = '${ExtractionFailedKey}'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const batchesWrittenWidget = {
  title: 'Batches Written',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', timestamp, '${timezone}') AS Time,
                INT64(json_payload['batch.rows'])       AS Entries,
                STRING(json_payload['batch.format'])    AS Format,
                STRING(json_payload['batch.datasetId']) AS Dataset,
                STRING(json_payload['batch.tableId'])   AS \`Table\`,
                STRING(json_payload['batch.path'])      AS \`Staging Path\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND severity = 'INFO'
                AND JSON_VALUE(json_payload, '$.event') = '${ExtractionBatchWrittenKey}'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

export function dataExtractionTiles(x: number, y: number): object[] {
  const tabY = y + 4
  const tabHeight = 26

  const tab = (widget: object) => ({
    yPos: tabY,
    xPos: x,
    height: tabHeight,
    width: 48,
    widget,
  })

  return [
    {
      yPos: y,
      xPos: x,
      height: 4,
      width: 48,
      widget: {
        title: 'Data Extraction',
        sectionHeader: {
          dividerBelow: true,
          subtitle: 'Fact check extraction results, errors, and batch output',
        },
      },
    },
    tab(tabGroup),
    tab(extractorJobRunsWidget),
    tab(extractionResultsWidget),
    tab(extractionErrorsWidget),
    tab(batchesWrittenWidget),
  ]
}
