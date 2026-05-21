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
        {
          height: 8,
          width: 11,
          widget: pipeline.totalHttpRequests,
        },
        {
          xPos: 11,
          height: 8,
          width: 11,
          widget: pipeline.percentFailedRequests,
        },
        {
          xPos: 22,
          height: 8,
          width: 11,
          widget: archive.archiveSize,
        },
        {
          xPos: 33,
          height: 8,
          width: 11,
          widget: archive.eventLogSize,
        },
        {
          yPos: 8,
          height: 8,
          width: 22,
          widget: pipeline.httpResponseStatuses,
        },
        {
          yPos: 8,
          xPos: 22,
          height: 8,
          width: 11,
          widget: archive.deadletterSize,
        },
        {
          yPos: 8,
          xPos: 33,
          height: 8,
          width: 11,
          widget: pipeline.stagingSize,
        },
        {
          yPos: 16,
          height: 8,
          width: 22,
          widget: unackedMessagesWidget,
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
