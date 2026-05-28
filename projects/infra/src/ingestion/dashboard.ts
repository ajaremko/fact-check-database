import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archiveWidgets } from './archive/dashboard'
import { pipelineWidgets } from './pipeline/dashboard'
import { tag } from './config'
import { provider } from './project'

const unackedMessagesWidget = {
  title: 'Unacked Messages by Subscription',
  id: '',
  xyChart: {
    chartOptions: {
      displayHorizontal: false,
      mode: 'COLOR',
      showLegend: false,
    },
    dataSets: [
      {
        breakdowns: [],
        dimensions: [],
        legendTemplate: '',
        measures: [],
        minAlignmentPeriod: '60s',
        plotType: 'STACKED_AREA',
        sort: [],
        targetAxis: 'Y1',
        timeSeriesQuery: {
          outputFullDuration: false,
          timeSeriesFilter: {
            aggregation: {
              alignmentPeriod: '60s',
              groupByFields: [],
              perSeriesAligner: 'ALIGN_MEAN',
            },
            filter: `metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages" resource.type="pubsub_subscription"`,
          },
          unitOverride: '',
        },
      },
    ],
    thresholds: [],
    yAxis: {
      label: '',
      scale: 'LINEAR',
    },
  },
}

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
        // Row 1 (y=0, h=12): Ingestor analysis — response codes and queue backpressure
        {
          yPos: 0,
          xPos: 0,
          height: 12,
          width: 24,
          widget: pipeline.httpResponseStatuses,
        },
        {
          yPos: 0,
          xPos: 24,
          height: 12,
          width: 24,
          widget: pipeline.sanitizerDecisionLabels,
        },
        // Row 2 (y=12, h=11): Pipeline quality — batch size distribution and policy decisions
        {
          yPos: 12,
          xPos: 0,
          height: 11,
          width: 24,
          widget: pipeline.rowsPerBatch,
        },
        {
          yPos: 12,
          xPos: 24,
          height: 11,
          width: 24,
          widget: unackedMessagesWidget,
        },
        // Row 3 (y=23, h=32):
        {
          yPos: 23,
          xPos: 0,
          height: 32,
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
        // Row 4 (y=55, h=8): Storage health — all buckets with deadletter last
        {
          yPos: 55,
          xPos: 0,
          height: 8,
          width: 12,
          widget: archive.archiveSize,
        },
        {
          yPos: 55,
          xPos: 12,
          height: 8,
          width: 12,
          widget: archive.eventLogSize,
        },
        {
          yPos: 55,
          xPos: 24,
          height: 8,
          width: 12,
          widget: pipeline.stagingSize,
        },
        {
          yPos: 55,
          xPos: 36,
          height: 8,
          width: 12,
          widget: archive.deadletterSize,
        },
        // Row 5 (y=63, h=8): Pipeline throughput KPIs — first 3 stages
        {
          yPos: 63,
          xPos: 0,
          height: 8,
          width: 16,
          widget: pipeline.totalHttpRequests,
        },
        {
          yPos: 63,
          xPos: 16,
          height: 8,
          width: 16,
          widget: pipeline.percentFailedRequests,
        },
        {
          yPos: 63,
          xPos: 32,
          height: 8,
          width: 16,
          widget: pipeline.sanitizerRecords,
        },
        // Row 6 (y=71, h=8): Pipeline throughput KPIs — last 3 stages
        {
          yPos: 71,
          xPos: 0,
          height: 8,
          width: 16,
          widget: pipeline.factCheckRows,
        },
        {
          yPos: 71,
          xPos: 16,
          height: 8,
          width: 16,
          widget: pipeline.batchesWritten,
        },
        {
          yPos: 71,
          xPos: 32,
          height: 8,
          width: 16,
          widget: pipeline.batchesLoaded,
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
