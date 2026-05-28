import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archiveWidgets } from './archive/dashboard'
import { pipelineWidgets } from './pipeline/dashboard'
import { tag } from './config'
import { provider } from './project'

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
