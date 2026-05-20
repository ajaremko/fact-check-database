import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  archiveBucketName,
  eventLogBucketName,
  deadletterBucketName,
} from './archive'
import { stagingBucketName } from './staging'
import { tag } from './config'
import { provider } from './project'

const pipelineDashboardJson = pulumi
  .all([
    stagingBucketName,
    archiveBucketName,
    eventLogBucketName,
    deadletterBucketName,
  ])
  .apply(
    ([
      stagingBucketName,
      rawArchiveBucketName,
      eventLogBucketName,
      deadletterBucketName,
    ]) =>
      JSON.stringify({
        displayName: 'Ingestion Dashboard',
        dashboardFilters: [],
        description: 'Ingestion pipeline and operations monitoring',
        labels: {},
        mosaicLayout: {
          columns: 48,
          tiles: [
            {
              height: 8,
              width: 11,
              widget: {
                title: 'Total HTTP Requests',
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
                    outputFullDuration: true,
                    timeSeriesFilter: {
                      aggregation: {
                        alignmentPeriod: '60s',
                        crossSeriesReducer: 'REDUCE_SUM',
                        groupByFields: [],
                        perSeriesAligner: 'ALIGN_MEAN',
                      },
                      filter:
                        'metric.type="workload.googleapis.com/ingestion.pipeline.ingest.requests" resource.type="generic_task"',
                    },
                    unitOverride: '',
                  },
                },
              },
            },
            {
              xPos: 11,
              height: 8,
              width: 11,
              widget: {
                title: 'Percent Failed Requests',
                scorecard: {
                  sparkChartView: {
                    minAlignmentPeriod: '60s',
                    sparkChartType: 'SPARK_LINE',
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
                    prometheusQuery:
                      'sum(avg_over_time({"__name__"="workload.googleapis.com/ingestion.pipeline.ingest.requestFailures","monitored_resource"="generic_task"}[${__interval}]))\n/\nsum(avg_over_time({"__name__"="workload.googleapis.com/ingestion.pipeline.ingest.requests","monitored_resource"="generic_task"}[${__interval}]))\n* 100 \n',
                  },
                },
              },
            },
            {
              xPos: 22,
              height: 8,
              width: 11,
              widget: {
                title: 'Raw Archive Total Bytes ',
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
                      filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${rawArchiveBucketName}"`,
                    },
                    unitOverride: '',
                  },
                },
              },
            },
            {
              xPos: 33,
              height: 8,
              width: 11,
              widget: {
                title: 'Event Archive Total Bytes ',
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
                      filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${eventLogBucketName}"`,
                    },
                    unitOverride: '',
                  },
                },
              },
            },
            {
              yPos: 8,
              height: 8,
              width: 22,
              widget: {
                title: 'HTTP Response Statuses',
                xyChart: {
                  chartOptions: {
                    displayHorizontal: false,
                    mode: 'COLOR',
                  },
                  dataSets: [
                    {
                      minAlignmentPeriod: '60s',
                      plotType: 'LINE',
                      targetAxis: 'Y1',
                      timeSeriesQuery: {
                        timeSeriesFilter: {
                          aggregation: {
                            alignmentPeriod: '60s',
                            groupByFields: [],
                            perSeriesAligner: 'ALIGN_RATE',
                          },
                          filter:
                            'metric.type="workload.googleapis.com/ingestion.pipeline.ingest.responseStatusCodes" resource.type="generic_task"',
                        },
                      },
                    },
                  ],
                  thresholds: [],
                  yAxis: {
                    scale: 'LINEAR',
                  },
                },
              },
            },
            {
              yPos: 8,
              xPos: 22,
              height: 8,
              width: 11,
              widget: {
                title: 'Deadletter Archive Total Bytes',
                id: '',
                scorecard: {
                  breakdowns: [],
                  dimensions: [],
                  measures: [],
                  sparkChartView: {
                    sparkChartType: 'SPARK_LINE',
                  },
                  thresholds: [
                    {
                      color: 'YELLOW',
                      direction: 'ABOVE',
                      label: '',
                      targetAxis: 'TARGET_AXIS_UNSPECIFIED',
                      value: 0,
                    },
                  ],
                  timeSeriesQuery: {
                    outputFullDuration: false,
                    timeSeriesFilter: {
                      aggregation: {
                        alignmentPeriod: '60s',
                        crossSeriesReducer: 'REDUCE_SUM',
                        groupByFields: [],
                        perSeriesAligner: 'ALIGN_MEAN',
                      },
                      filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${deadletterBucketName}"`,
                    },
                    unitOverride: '',
                  },
                },
              },
            },
            {
              yPos: 8,
              xPos: 33,
              height: 8,
              width: 11,
              widget: {
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
                      filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${stagingBucketName}"`,
                    },
                    unitOverride: '',
                  },
                },
              },
            },
            {
              yPos: 16,
              height: 8,
              width: 22,
              widget: {
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
                          filter:
                            'metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages" resource.type="pubsub_subscription"',
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
