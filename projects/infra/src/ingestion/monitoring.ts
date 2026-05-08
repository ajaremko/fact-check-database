import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { stagingBucket, eventLogBucket, deadletterBucket } from './storage'
import { tag } from './config'
import { provider } from './provider'

const pipelineDashboardJson = pulumi
  .all([stagingBucket.name, eventLogBucket.name, deadletterBucket.name])
  .apply(([stagingBucketName, eventLogBucketName, deadletterBucketName]) =>
    JSON.stringify({
      displayName: 'Pipeline Dashboard',
      dashboardFilters: [],
      description: '',
      labels: {},
      mosaicLayout: {
        columns: 48,
        tiles: [
          {
            height: 10,
            width: 9,
            widget: {
              title: 'Staging storage',
              scorecard: {
                sparkChartView: {
                  sparkChartType: 'SPARK_BAR',
                },
                thresholds: [
                  {
                    color: 'YELLOW',
                    direction: 'BELOW',
                    targetAxis: 'Y1',
                    value: 1000000,
                  },
                  {
                    color: 'RED',
                    direction: 'BELOW',
                    targetAxis: 'Y1',
                    value: 1,
                  },
                ],
                timeSeriesQuery: {
                  outputFullDuration: true,
                  timeSeriesFilter: {
                    aggregation: {
                      alignmentPeriod: '60s',
                      crossSeriesReducer: 'REDUCE_SUM',
                      groupByFields: [],
                      perSeriesAligner: 'ALIGN_MEAN',
                    },
                    filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${stagingBucketName}"`,
                  },
                },
              },
            },
          },
          {
            xPos: 9,
            height: 10,
            width: 9,
            widget: {
              title: 'Event log storage (bytes)',
              scorecard: {
                sparkChartView: {
                  sparkChartType: 'SPARK_BAR',
                },
                thresholds: [
                  {
                    color: 'YELLOW',
                    direction: 'BELOW',
                    targetAxis: 'Y1',
                    value: 1000000,
                  },
                  {
                    color: 'RED',
                    direction: 'BELOW',
                    targetAxis: 'Y1',
                    value: 1,
                  },
                ],
                timeSeriesQuery: {
                  outputFullDuration: true,
                  timeSeriesFilter: {
                    aggregation: {
                      alignmentPeriod: '60s',
                      crossSeriesReducer: 'REDUCE_SUM',
                      groupByFields: [],
                      perSeriesAligner: 'ALIGN_MEAN',
                    },
                    filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${eventLogBucketName}"`,
                  },
                },
              },
            },
          },
          {
            xPos: 18,
            height: 10,
            width: 9,
            widget: {
              title: 'Deadletter storage (bytes)',
              scorecard: {
                sparkChartView: {
                  sparkChartType: 'SPARK_BAR',
                },
                thresholds: [
                  {
                    color: 'YELLOW',
                    direction: 'ABOVE',
                    targetAxis: 'Y1',
                    value: 0,
                  },
                ],
                timeSeriesQuery: {
                  outputFullDuration: true,
                  timeSeriesFilter: {
                    aggregation: {
                      alignmentPeriod: '60s',
                      crossSeriesReducer: 'REDUCE_SUM',
                      groupByFields: [],
                      perSeriesAligner: 'ALIGN_MEAN',
                    },
                    filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${deadletterBucketName}"`,
                  },
                },
              },
            },
          },
          {
            xPos: 27,
            height: 10,
            width: 19,
            widget: {
              title: 'Publish requests by topic',
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
                          perSeriesAligner: 'ALIGN_RATE',
                        },
                        filter:
                          'metric.type="pubsub.googleapis.com/topic/send_request_count" resource.type="pubsub_topic"',
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
            },
          },
          {
            yPos: 10,
            height: 22,
            width: 46,
            widget: {
              title: 'Pipeline Logs',
              id: '',
              logsPanel: {
                filter:
                  'jsonPayload.serviceContext.service="loader-service" OR "sanitizer-service" OR "ingestor-job" OR "extractor-job"\n',
                resourceNames: [
                  'projects/news-research-dev/locations/global/logScopes/_Default',
                ],
              },
            },
          },
        ],
      },
    })
  )

export const pipelineDashboard = new gcp.monitoring.Dashboard(
  `${tag}-pipeline-dashboard`,
  {
    dashboardJson: pipelineDashboardJson,
  },
  {
    provider,
  }
)

export const pipelineDashboardId = pipelineDashboard.id
