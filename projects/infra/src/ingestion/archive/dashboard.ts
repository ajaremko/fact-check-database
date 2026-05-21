import * as pulumi from '@pulumi/pulumi'

import { archiveBucketName } from './raw'
import { deadletterBucketName } from './deadletter'
import { eventLogBucketName } from './events'

const archiveSizeWidget = archiveBucketName.apply((name) => ({
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
          groupByFields: [],
          perSeriesAligner: 'ALIGN_MEAN',
        },
        filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${name}"`,
      },
      unitOverride: '',
    },
  },
}))

const deadletterSizeWidget = deadletterBucketName.apply((name) => ({
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
          groupByFields: [],
          perSeriesAligner: 'ALIGN_MEAN',
        },
        filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${name}"`,
      },
      unitOverride: '',
    },
  },
}))

const eventLogSizeWidget = eventLogBucketName.apply((name) => ({
  title: 'Event Archive Total Bytes',
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
          groupByFields: [],
          perSeriesAligner: 'ALIGN_MEAN',
        },
        filter: `metric.type="storage.googleapis.com/storage/v2/total_bytes" resource.type="gcs_bucket" resource.label."bucket_name"="${name}"`,
      },
      unitOverride: '',
    },
  },
}))

export const archiveWidgets = pulumi
  .all<object>([archiveSizeWidget, deadletterSizeWidget, eventLogSizeWidget])
  .apply(([archiveSize, deadletterSize, eventLogSize]) => ({
    archiveSize,
    deadletterSize,
    eventLogSize,
  }))
