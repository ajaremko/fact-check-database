import * as pulumi from '@pulumi/pulumi'

import {
  extractorFactCheckRowCounterMetricType,
  extractorBatchesWrittenCounterMetricType,
  extractorRowsPerBatchHistogramMetricType,
} from './extractor'
import {
  ingestorRequestCounterMetricType,
  ingestorRequestFailureCounterMetricType,
  ingestorResponseCodeFrequencyMetricType,
} from './ingestor'
import { loaderBatchesLoadedCounterMetricType } from './loader'
import {
  sanitizerRecordsCounterMetricType,
  sanitizerDecisionLabelFrequencyMetricType,
} from './sanitizer'
import { stagingBucketName } from './staging'

const totalHttpRequestsWidget = ingestorRequestCounterMetricType.apply(
  (type) => ({
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
          filter: `metric.type="${type}" resource.type="generic_task"`,
        },
        unitOverride: '',
      },
    },
  })
)

const interval = '[${__interval}]'

const percentFailedRequestsWidget = pulumi
  .all([
    ingestorRequestFailureCounterMetricType,
    ingestorRequestCounterMetricType,
  ])
  .apply(([failureCounter, counter]) => ({
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
        prometheusQuery: `
          sum(avg_over_time({"__name__"="${failureCounter}","monitored_resource"="generic_task"}${interval}))
          /
          sum(avg_over_time({"__name__"="${counter}","monitored_resource"="generic_task"}${interval}))
          * 100`,
      },
    },
  }))

const httpResponseStatusesWidget =
  ingestorResponseCodeFrequencyMetricType.apply((type) => ({
    title: 'HTTP Response Statuses',
    xyChart: {
      chartOptions: {
        displayHorizontal: false,
        mode: 'COLOR',
      },
      dataSets: [
        {
          minAlignmentPeriod: '60s',
          plotType: 'HEATMAP',
          targetAxis: 'Y1',
          timeSeriesQuery: {
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: [],
                perSeriesAligner: 'ALIGN_SUM',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
      thresholds: [],
      yAxis: {
        scale: 'LINEAR',
      },
    },
  }))

const stagingSizeWidget = stagingBucketName.apply((name) => ({
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

const extractorBatchesWrittenWidget =
  extractorBatchesWrittenCounterMetricType.apply((type) => ({
    title: 'Extraction Batches Written',
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
          filter: `metric.type="${type}" resource.type="generic_task"`,
        },
        unitOverride: '',
      },
    },
  }))

const extractorFactCheckRowsWidget =
  extractorFactCheckRowCounterMetricType.apply((type) => ({
    title: 'Fact Check Rows Extracted',
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
          filter: `metric.type="${type}" resource.type="generic_task"`,
        },
        unitOverride: '',
      },
    },
  }))

const sanitizerRecordsWidget = sanitizerRecordsCounterMetricType.apply(
  (type) => ({
    title: 'Records Sanitized',
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
          filter: `metric.type="${type}" resource.type="generic_task"`,
        },
        unitOverride: '',
      },
    },
  })
)

const sanitizerDecisionLabelsWidget =
  sanitizerDecisionLabelFrequencyMetricType.apply((type) => ({
    title: 'Sanitizer Policy Decisions',
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
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: ['metric.label."decision"'],
                perSeriesAligner: 'ALIGN_MEAN',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
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
  }))

const loaderBatchesLoadedWidget = loaderBatchesLoadedCounterMetricType.apply(
  (type) => ({
    title: 'Batches Loaded to BigQuery',
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
          filter: `metric.type="${type}" resource.type="generic_task"`,
        },
        unitOverride: '',
      },
    },
  })
)

const rowsPerBatchWidget = extractorRowsPerBatchHistogramMetricType.apply(
  (type) => ({
    title: 'Rows Per Batch Distribution',
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
          plotType: 'HEATMAP',
          sort: [],
          targetAxis: 'Y1',
          timeSeriesQuery: {
            outputFullDuration: false,
            timeSeriesFilter: {
              aggregation: {
                alignmentPeriod: '60s',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: [],
                perSeriesAligner: 'ALIGN_SUM',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
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
  })
)

export const pipelineWidgets = pulumi
  .all<object>([
    totalHttpRequestsWidget,
    percentFailedRequestsWidget,
    httpResponseStatusesWidget,
    stagingSizeWidget,
    extractorBatchesWrittenWidget,
    extractorFactCheckRowsWidget,
    sanitizerRecordsWidget,
    sanitizerDecisionLabelsWidget,
    loaderBatchesLoadedWidget,
    rowsPerBatchWidget,
  ])
  .apply(
    ([
      totalHttpRequests,
      percentFailedRequests,
      httpResponseStatuses,
      stagingSize,
      batchesWritten,
      factCheckRows,
      sanitizerRecords,
      sanitizerDecisionLabels,
      batchesLoaded,
      rowsPerBatch,
    ]) => ({
      totalHttpRequests,
      percentFailedRequests,
      httpResponseStatuses,
      stagingSize,
      batchesWritten,
      factCheckRows,
      sanitizerRecords,
      sanitizerDecisionLabels,
      batchesLoaded,
      rowsPerBatch,
    })
  )
