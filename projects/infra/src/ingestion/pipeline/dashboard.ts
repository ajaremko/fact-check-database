import * as pulumi from '@pulumi/pulumi'

import {
  extractorFactCheckRowCounterMetricType,
  // extractorBatchesWrittenCounterMetricType,
} from './extractor'
import { ingestorContentRequestResultsCounterMetricType } from './ingestor'
// import { loaderBatchesLoadedCounterMetricType } from './loader'
import { sanitizerRecordsCounterMetricType } from './sanitizer'
import { stagingBucketName } from './staging'

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
