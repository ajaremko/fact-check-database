import * as pulumi from '@pulumi/pulumi'

import { extractorFactCheckRowCounterMetricType } from '../extractor'
import { ingestorContentRequestResultsCounterMetricType } from '../ingestor'
import { sanitizerRecordsCounterMetricType } from '../sanitizer'

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
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: ['metric.label."source_name"'],
                perSeriesAligner: 'ALIGN_SUM',
              },
              filter: `metric.type="${type}" resource.type="generic_task"`,
            },
          },
        },
      ],
    },
  }))

export function overviewTiles(x: number, y: number): pulumi.Output<object[]> {
  return pulumi
    .all([
      contentRequestsByStatusWidget,
      contentRecordsSanitizedWidget,
      extractorFactCheckRowsWidget,
    ])
    .apply(([contentRequestsByStatus, contentRecordsSanitized, extractorFactCheckRows]) => [
      {
        yPos: y,
        xPos: x,
        height: 4,
        width: 48,
        widget: {
          title: 'Overview',
          sectionHeader: {
            dividerBelow: true,
            subtitle: 'Pipeline health and activity at a glance',
          },
        },
      },
      {
        yPos: y + 4,
        xPos: x,
        height: 12,
        width: 16,
        widget: contentRequestsByStatus,
      },
      {
        yPos: y + 4,
        xPos: x + 16,
        height: 12,
        width: 16,
        widget: contentRecordsSanitized,
      },
      {
        yPos: y + 4,
        xPos: x + 32,
        height: 12,
        width: 16,
        widget: extractorFactCheckRows,
      },
    ])
}
