import * as pulumi from '@pulumi/pulumi'

import {
  extractorFactCheckRowCounterMetricType,
  extractorBatchesWrittenCounterMetricType,
} from './extractor'
import {
  ingestorRequestCounterMetricType,
  ingestorRequestFailureCounterMetricType,
  ingestorResponseCounterMetricType,
} from './ingestor'
import { loaderBatchesLoadedCounterMetricType } from './loader'
import { sanitizerRecordsCounterMetricType } from './sanitizer'
import { stagingBucketName } from './staging'

const totalHttpRequestsWidget = ingestorRequestCounterMetricType.apply(
  (type) => ({
    title: 'Requests for Content',
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
    title: 'Requests Failed (%)',
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

const httpResponseStatusesWidget = ingestorResponseCounterMetricType.apply(
  (type) => ({
    title: 'HTTP Response Statuses',
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
  })
)

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
    title: 'Batches Written',
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
    title: 'Rows Extracted',
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
    title: 'Content Records Sanitized',
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

const sanitizerDecisionLabelsWidget = sanitizerRecordsCounterMetricType.apply(
  (type) => ({
    title: 'Sanitizer Policy Decisions',
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

const loaderBatchesLoadedWidget = loaderBatchesLoadedCounterMetricType.apply(
  (type) => ({
    title: 'Batches Loaded',
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

const rowsPerBatchWidget = pulumi.output('null').apply((type) => ({
  title: 'Rows Per Batch',
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

export const pipelineWidgets = pulumi
  .all<object>([
    totalHttpRequestsWidget,
    percentFailedRequestsWidget,
    httpResponseStatusesWidget,
    stagingSizeWidget,
    extractorBatchesWrittenWidget,
    extractorFactCheckRowsWidget,
    rowsPerBatchWidget,
    sanitizerRecordsWidget,
    sanitizerDecisionLabelsWidget,
    loaderBatchesLoadedWidget,
  ])
  .apply(
    ([
      totalHttpRequests,
      percentFailedRequests,
      httpResponseStatuses,
      stagingSize,
      batchesWritten,
      factCheckRows,
      rowsPerBatch,
      sanitizerRecords,
      sanitizerDecisionLabels,
      batchesLoaded,
    ]) => ({
      totalHttpRequests,
      percentFailedRequests,
      httpResponseStatuses,
      stagingSize,
      batchesWritten,
      factCheckRows,
      rowsPerBatch,
      sanitizerRecords,
      sanitizerDecisionLabels,
      batchesLoaded,
    })
  )
