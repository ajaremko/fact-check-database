import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archiveWidgets } from './archive/dashboard'
import { gcpProject, tag } from './config'
import { provider } from './project'

import { stagingStorageBucketName } from '../core'

import { extractorFactCheckRowCounterMetricType } from './extractor'
import { ingestorContentRequestResultsCounterMetricType } from './ingestor'
import { sanitizerRecordsCounterMetricType } from './sanitizer'

const timezone = 'America/Los_Angeles'

const contentSourcesWidget = {
  title: 'Archived Requests',
  timeSeriesTable: {
    columnSettings: [],
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')          AS Date,
                FORMAT_TIMESTAMP('%R:%M %p', MAX(timestamp), '${timezone}')    AS Time,
                STRING(json_payload['source.id'])               AS \`Source ID\`,
                STRING(json_payload['source.name'])             AS Name,
                STRING(json_payload['source.url'])              AS URL,
                STRING(json_payload['source.collection'])       AS Collection,
                STRING(json_payload['result.status'])           AS Status,
                INT64(json_payload['result.status_code'])       AS Code,
                STRING(json_payload['result.content_type'])     AS \`Content Type\`,
                COUNT(*)                                        AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND JSON_VALUE(json_payload, '$.event') = 'fetch_success'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-ingestor'
              GROUP BY Name, \`Source ID\`, Collection, URL, Status, Code, \`Content Type\`
              ORDER BY Date, Time, Name, Code
              LIMIT 1000`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const sanitizerDecisionsWidget =
  ingestorContentRequestResultsCounterMetricType.apply((type) => ({
    title: 'Latest Sanitizer Decisions',
    timeSeriesTable: {
      columnSettings: [
        {
          displayName: 'ID',
          column: 'source_id',
          visible: true,
        },
        {
          displayName: 'Name',
          column: 'source_name',
          visible: true,
        },
        {
          displayName: 'URL',
          column: 'source_url',
          visible: true,
        },
        {
          displayName: 'Collection',
          column: 'source_collection',
          visible: true,
        },
        {
          displayName: 'Status',
          column: 'result_status',
          visible: false,
        },
        {
          displayName: 'Code',
          column: 'result_status_code',
          visible: false,
        },
        {
          displayName: 'Content Type',
          column: 'result_content_type',
          visible: false,
        },
        {
          displayName: 'Records Sanitized',
          column: 'value',
          visible: true,
        },
        {
          displayName: 'Decision Label',
          column: 'decision_label',
          visible: true,
        },
      ],
      dataSets: [
        {
          minAlignmentPeriod: '60s',
          timeSeriesQuery: {
            outputFullDuration: true,
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: [
                  'metric.label."source_name"',
                  'metric.label."source_id"',
                  'metric.label."source_url"',
                  'metric.label."decision_label"',
                ],
                perSeriesAligner: 'ALIGN_MEAN',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
      metricVisualization: 'BAR',
    },
  }))

const contentRequestsByStatusWidget =
  ingestorContentRequestResultsCounterMetricType.apply((type) => ({
    title: 'Content Requests by Result',
    pieChart: {
      chartType: 'DONUT',
      dataSets: [
        {
          minAlignmentPeriod: '60s',
          timeSeriesQuery: {
            outputFullDuration: true,
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: ['metric.label."result_status"'],
                perSeriesAligner: 'ALIGN_COUNT',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
    },
  }))

const contentRecordsSanitizedWidget = sanitizerRecordsCounterMetricType.apply(
  (type) => ({
    title: 'Content Records Sanitized by Label',
    pieChart: {
      chartType: 'DONUT',
      dataSets: [
        {
          minAlignmentPeriod: '60s',
          timeSeriesQuery: {
            outputFullDuration: true,
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_COUNT',
                groupByFields: ['metric.label."decision_label"'],
                perSeriesAligner: 'ALIGN_COUNT',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
    },
  })
)

const extractorFactCheckRowsWidget =
  extractorFactCheckRowCounterMetricType.apply((type) => ({
    title: 'Fact Checks Extracted by Source',
    pieChart: {
      chartType: 'DONUT',
      dataSets: [
        {
          minAlignmentPeriod: '60s',
          timeSeriesQuery: {
            outputFullDuration: true,
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: ['metric.label."source_name"'],
                perSeriesAligner: 'ALIGN_SUM',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
    },
  }))

const stagingSizeWidget = stagingStorageBucketName.apply((name) => ({
  title: 'Staging Storage Total Bytes',
  id: '',
  scorecard: {
    breakdowns: [],
    dimensions: [],
    measures: [],
    sparkChartView: {
      sparkChartType: 'SPARK_LINE',
    },
    thresholds: [],
    timeSeriesQuery: {
      outputFullDuration: false,
      timeSeriesFilter: {
        aggregation: {
          alignmentPeriod: '60s',
          crossSeriesReducer: 'REDUCE_SUM',
          groupByFields: [],
          perSeriesAligner: 'ALIGN_MEAN',
        },
        filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${name}"`,
      },
      unitOverride: '',
    },
  },
}))

const contentFailuresWidget = {
  title: 'HTTP Failures',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')          AS Date,
                FORMAT_TIMESTAMP('%R:%M %p', MAX(timestamp), '${timezone}')    AS Time,
                STRING(json_payload['source.id'])               AS \`Source ID\`,
                STRING(json_payload['source.name'])             AS Name,
                STRING(json_payload['source.collection'])       AS Collection,
                STRING(json_payload['source.url'])              AS URL,
                STRING(json_payload['result.error'])            AS Error,
                COUNT(*)                                        AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND severity = 'WARNING'
                AND JSON_VALUE(json_payload, '$.event') = 'fetch_failure'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-ingestor'
              GROUP BY Name, \`Source ID\`, Collection, URL, Error
              ORDER BY Name`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const sanitizerDecisionsTableWidget = {
  title: 'Sanitizer Decisions',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')          AS Date,
                FORMAT_TIMESTAMP('%R:%M %p', MAX(timestamp), '${timezone}')    AS Time,
                STRING(json_payload['source.id'])               AS \`Source ID\`,
                STRING(json_payload['source.name'])             AS Name,
                STRING(json_payload['source.url'])              AS URL,
                STRING(json_payload['source.collection'])       AS Collection,
                STRING(json_payload['decision.label'])          AS Decision,
                COUNT(*)                                        AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND severity = 'INFO'
                AND JSON_VALUE(json_payload, '$.event') = 'record_sanitized'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-sanitizer'
              GROUP BY Name, \`Source ID\`, Collection, URL, Decision
              ORDER BY Name, Decision`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const ingestorJobRunsWidget = {
  title: 'Ingestor Job Runs',
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
                FORMAT_TIMESTAMP('%R:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload.serviceContext.version) AS Version,s
                STRING(json_payload['job.result']) AS Result,
                INT64(json_payload['job.tasks']) AS Sources,
                INT64(json_payload['job.failures']) AS Failures,
                FLOAT64(json_payload['job.successThreshold']) AS \`Success Threshold\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND JSON_VALUE(json_payload, '$.event') = 'ingestor_job_completed'
              ORDER BY timestamp DESC
              LIMIT 50`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const extractorJobRunsWidget = {
  title: 'Extractor Job Runs',
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
                FORMAT_TIMESTAMP('%R:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload.serviceContext.version) AS Version,
                INT64(json_payload['job.tasks']) AS Records,
                INT64(json_payload['job.failures']) AS Failures,
                INT64(json_payload['job.rowsExtracted']) AS \`Rows Extracted\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND JSON_VALUE(json_payload, '$.event') = 'extractor_job_completed'
              ORDER BY timestamp DESC
              LIMIT 50`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const factChecksExtractedWidget = {
  title: 'Fact Checks Extracted',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}')        AS Date,
                FORMAT_TIMESTAMP('%R:%M %p', timestamp, '${timezone}')  AS Time,
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
                AND JSON_VALUE(json_payload, '$.event') = 'fact_checks_extracted'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const extractionErrorWidget = {
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
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}')        AS Date,
                FORMAT_TIMESTAMP('%R:%M %p', timestamp, '${timezone}')  AS Time,
                STRING(json_payload['extractor.id'])      AS Extractor,
                INT64(json_payload['extractor.version'])  AS Version,
                STRING(json_payload['type'])              AS \`Error Type\`,
                STRING(json_payload['message'])           AS Message,
                STRING(json_payload['source.id'])         AS \`Source ID\`,
                STRING(json_payload['source.name'])       AS Source,
                STRING(json_payload['source.collection']) AS Collection,
                STRING(json_payload['job.runId'])         AS \`Run ID\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND severity = 'WARNING'
                AND JSON_VALUE(json_payload, '$.event') = 'extraction_error'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const batchWrittenWidget = {
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
                FORMAT_TIMESTAMP('%R:%M %p', timestamp, '${timezone}') AS Time,
                INT64(json_payload['batch.rows'])       AS Entries,
                STRING(json_payload['batch.format'])    AS Format,
                STRING(json_payload['batch.datasetId']) AS Dataset,
                STRING(json_payload['batch.tableId'])   AS \`Table\`,
                STRING(json_payload['batch.path'])      AS \`Staging Path\`
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND severity = 'INFO'
                AND JSON_VALUE(json_payload, '$.event') = 'batch_written'
              ORDER BY timestamp DESC
              LIMIT 100`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

export const pipelineWidgets = pulumi
  .all<object>([
    contentRequestsByStatusWidget,
    stagingSizeWidget,
    extractorFactCheckRowsWidget,
    contentRecordsSanitizedWidget,
    contentSourcesWidget,
    contentFailuresWidget,
    sanitizerDecisionsTableWidget,
    ingestorJobRunsWidget,
    extractorJobRunsWidget,
    factChecksExtractedWidget,
    extractionErrorWidget,
    batchWrittenWidget,
    sanitizerDecisionsWidget,
  ])
  .apply(
    ([
      contentRequestsByStatus,
      stagingSize,
      extractorFactCheckRows,
      contentRecordsSanitized,
      contentSources,
      contentFailures,
      sanitizerDecisionsTable,
      ingestorJobRuns,
      extractorJobRuns,
      factChecksExtracted,
      extractionErrors,
      batchesWritten,
      sanitizerDecisions,
    ]) => ({
      contentRequestsByStatus,
      stagingSize,
      extractorFactCheckRows,
      contentRecordsSanitized,
      contentSources,
      contentFailures,
      sanitizerDecisionsTable,
      ingestorJobRuns,
      extractorJobRuns,
      factChecksExtracted,
      extractionErrors,
      batchesWritten,
      sanitizerDecisions,
    })
  )

// const unackedMessagesWidget = {
//   title: 'Unacked Messages by Subscription',
//   id: '',
//   xyChart: {
//     chartOptions: {
//       displayHorizontal: false,
//       mode: 'COLOR',
//       showLegend: false,
//     },
//     dataSets: [
//       {
//         breakdowns: [],
//         dimensions: [],
//         legendTemplate: '',
//         measures: [],
//         minAlignmentPeriod: '60s',
//         plotType: 'STACKED_AREA',
//         sort: [],
//         targetAxis: 'Y1',
//         timeSeriesQuery: {
//           outputFullDuration: false,
//           timeSeriesFilter: {
//             aggregation: {
//               alignmentPeriod: '60s',
//               groupByFields: [],
//               perSeriesAligner: 'ALIGN_MEAN',
//             },
//             filter: `metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages" resource.type="pubsub_subscription"`,
//           },
//           unitOverride: '',
//         },
//       },
//     ],
//     thresholds: [],
//     yAxis: {
//       label: '',
//       scale: 'LINEAR',
//     },
//   },
// }

const pipelineDashboardJson = pulumi
  .all([archiveWidgets, pipelineWidgets])
  .apply(([archive, pipeline]) => ({
    displayName: 'Ingestion Dashboard (Pulumi)',
    dashboardFilters: [],
    description: 'Ingestion pipeline and operations monitoring',
    labels: {},
    mosaicLayout: {
      columns: 48,
      tiles: [
        // Row 1 (y=0, h=12): Ingestor analysis — pipeline kpis
        {
          yPos: 0,
          xPos: 0,
          height: 12,
          width: 16,
          widget: pipeline.contentRequestsByStatus,
        },
        {
          yPos: 0,
          xPos: 16,
          height: 12,
          width: 16,
          widget: pipeline.contentRecordsSanitized,
        },
        {
          yPos: 0,
          xPos: 32,
          height: 12,
          width: 16,
          widget: pipeline.extractorFactCheckRows,
        },
        // Row 2 (y=12, h=19): Content request results
        {
          yPos: 12,
          xPos: 0,
          height: 19,
          width: 48,
          widget: pipeline.contentSources,
        },
        // Row 3 (y=31, h=19): Content request failures
        {
          yPos: 31,
          xPos: 0,
          height: 19,
          width: 48,
          widget: pipeline.contentFailures,
        },
        // Row 4 (y=50, h=19): Content sanitizer decisions
        {
          yPos: 50,
          xPos: 0,
          height: 19,
          width: 48,
          widget: pipeline.sanitizerDecisionsTable,
        },
        // Row 5 (y=69, h=16): Job run logs — ingestor and extractor side by side
        {
          yPos: 69,
          xPos: 0,
          height: 16,
          width: 24,
          widget: pipeline.ingestorJobRuns,
        },
        {
          yPos: 69,
          xPos: 24,
          height: 16,
          width: 24,
          widget: pipeline.extractorJobRuns,
        },
        // Row 6 (y=85, h=16): Fact checks extracted
        {
          yPos: 85,
          xPos: 0,
          height: 16,
          width: 48,
          widget: pipeline.factChecksExtracted,
        },
        // Row 7 (y=101, h=16): Extraction errors
        {
          yPos: 101,
          xPos: 0,
          height: 16,
          width: 48,
          widget: pipeline.extractionErrors,
        },
        // Row 8 (y=117, h=16): Batches written
        {
          yPos: 117,
          xPos: 0,
          height: 16,
          width: 48,
          widget: pipeline.batchesWritten,
        },
        // Row 9 (y=133, h=19): Pipeline logs
        {
          yPos: 133,
          xPos: 0,
          height: 19,
          width: 48,
          widget: {
            title: 'Pipeline Logs',
            logsPanel: {
              filter: 'jsonPayload.serviceContext.service=~"^@news-research/"',
              resourceNames: [
                'projects/news-research-dev/locations/global/logScopes/_Default',
              ],
            },
          },
        },
        // Row 10 (y=152, h=8): Storage health — all buckets with deadletter last
        {
          yPos: 152,
          xPos: 0,
          height: 8,
          width: 12,
          widget: archive.archiveSize,
        },
        {
          yPos: 152,
          xPos: 12,
          height: 8,
          width: 12,
          widget: archive.eventLogSize,
        },
        {
          yPos: 152,
          xPos: 24,
          height: 8,
          width: 12,
          widget: pipeline.stagingSize,
        },
        {
          yPos: 152,
          xPos: 36,
          height: 8,
          width: 12,
          widget: archive.deadletterSize,
        },
      ],
    },
  }))
  .apply((d) => JSON.stringify(d))

export const pipelineDashboard = new gcp.monitoring.Dashboard(
  `${tag}-pipeline-dashboard`,
  { dashboardJson: pipelineDashboardJson },
  { provider }
)
