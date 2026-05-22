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
        // Row 1 (y=0, h=8): Pipeline throughput KPIs — one scorecard per stage
        {
          yPos: 0,
          xPos: 0,
          height: 8,
          width: 8,
          widget: pipeline.totalHttpRequests,
        },
        {
          yPos: 0,
          xPos: 8,
          height: 8,
          width: 8,
          widget: pipeline.percentFailedRequests,
        },
        {
          yPos: 0,
          xPos: 16,
          height: 8,
          width: 8,
          widget: pipeline.sanitizerRecords,
        },
        {
          yPos: 0,
          xPos: 24,
          height: 8,
          width: 8,
          widget: pipeline.batchesWritten,
        },
        {
          yPos: 0,
          xPos: 32,
          height: 8,
          width: 8,
          widget: pipeline.factCheckRows,
        },
        {
          yPos: 0,
          xPos: 40,
          height: 8,
          width: 8,
          widget: pipeline.batchesLoaded,
        },
        // Row 2 (y=8, h=8): Ingestor analysis — response codes and queue backpressure
        {
          yPos: 8,
          xPos: 0,
          height: 12,
          width: 24,
          widget: pipeline.httpResponseStatuses,
        },
        {
          yPos: 8,
          xPos: 24,
          height: 12,
          width: 24,
          widget: unackedMessagesWidget,
        },
        // Row 3 (y=16, h=8): Pipeline quality — batch size distribution and policy decisions
        {
          yPos: 20,
          xPos: 0,
          height: 11,
          width: 24,
          widget: pipeline.rowsPerBatch,
        },
        {
          yPos: 20,
          xPos: 24,
          height: 11,
          width: 24,
          widget: pipeline.sanitizerDecisionLabels,
        },
        // Row 4 (y=24, h=8): Storage health — all buckets with deadletter last
        {
          yPos: 31,
          xPos: 0,
          height: 8,
          width: 12,
          widget: archive.archiveSize,
        },
        {
          yPos: 31,
          xPos: 12,
          height: 8,
          width: 12,
          widget: archive.eventLogSize,
        },
        {
          yPos: 31,
          xPos: 24,
          height: 8,
          width: 12,
          widget: pipeline.stagingSize,
        },
        {
          yPos: 31,
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
