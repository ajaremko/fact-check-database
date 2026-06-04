import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archiveWidgets } from './archive/dashboard'
import { tag } from './config'
import { provider } from './project'

import { stagingStorageBucketName } from '../core'

import {
  extractorFactCheckRowCounterMetricType,
  // extractorBatchesWrittenCounterMetricType,
} from './extractor'
import { ingestorContentRequestResultsCounterMetricType } from './ingestor'
import { sanitizerRecordsCounterMetricType } from './sanitizer'

const contentSourcesWidget =
  ingestorContentRequestResultsCounterMetricType.apply((type) => ({
    title: 'Content Sources',
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
          displayName: 'Request Count',
          column: 'value',
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
                  'metric.label."source_collection"',
                  'metric.label."source_name"',
                  'metric.label."source_id"',
                  'metric.label."source_url"',
                  'metric.label."result_status"',
                  'metric.label."result_content_type"',
                  'metric.label."result_status_code"',
                ],
                perSeriesAligner: 'ALIGN_COUNT',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
              pickTimeSeriesFilter: {
                direction: 'TOP',
                numTimeSeries: 30,
                rankingMethod: 'METHOD_MEAN',
              },
            },
          },
        },
      ],
      metricVisualization: 'BAR',
    },
  }))

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
                crossSeriesReducer: 'REDUCE_COUNT',
                groupByFields: ['metric.label."source_name"'],
                perSeriesAligner: 'ALIGN_COUNT',
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

export const pipelineWidgets = pulumi
  .all<object>([
    contentRequestsByStatusWidget,
    stagingSizeWidget,
    extractorFactCheckRowsWidget,
    contentRecordsSanitizedWidget,
    contentSourcesWidget,
    sanitizerDecisionsWidget,
  ])
  .apply(
    ([
      contentRequestsByStatus,
      stagingSize,
      extractorFactCheckRows,
      contentRecordsSanitized,
      contentSources,
      sanitizerDecisions,
    ]) => ({
      contentRequestsByStatus,
      stagingSize,
      extractorFactCheckRows,
      contentRecordsSanitized,
      contentSources,
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
        // Row 2 (y=12, h=19): Recently ingested content sources
        {
          yPos: 12,
          xPos: 0,
          height: 19,
          width: 48,
          widget: pipeline.contentSources,
        },
        // Row 3 (y=31, h=19): Pipeline logs
        {
          yPos: 31,
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
        // Row 4 (y=50, h=8): Storage health — all buckets with deadletter last
        {
          yPos: 50,
          xPos: 0,
          height: 8,
          width: 12,
          widget: archive.archiveSize,
        },
        {
          yPos: 50,
          xPos: 12,
          height: 8,
          width: 12,
          widget: archive.eventLogSize,
        },
        {
          yPos: 50,
          xPos: 24,
          height: 8,
          width: 12,
          widget: pipeline.stagingSize,
        },
        {
          yPos: 50,
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
