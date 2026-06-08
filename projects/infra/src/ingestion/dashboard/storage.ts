import * as pulumi from '@pulumi/pulumi'

import { stagingStorageBucketName } from '../../core'
import { archiveWidgets } from '../archive/dashboard'

const stagingSizeWidget = stagingStorageBucketName.apply((name) => ({
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

export function storageTiles(x: number, y: number): pulumi.Output<object[]> {
  return pulumi.all([archiveWidgets, stagingSizeWidget]).apply(([archive, stagingSize]) => [
    {
      yPos: y,
      xPos: x,
      height: 4,
      width: 48,
      widget: {
        title: 'Storage',
        sectionHeader: {
          dividerBelow: true,
          subtitle: 'Storage bucket sizes across the ingestion pipeline',
        },
      },
    },
    {
      yPos: y + 4,
      xPos: x,
      height: 8,
      width: 12,
      widget: archive.archiveSize,
    },
    {
      yPos: y + 4,
      xPos: x + 12,
      height: 8,
      width: 12,
      widget: archive.eventLogSize,
    },
    {
      yPos: y + 4,
      xPos: x + 24,
      height: 8,
      width: 12,
      widget: stagingSize,
    },
    {
      yPos: y + 4,
      xPos: x + 36,
      height: 8,
      width: 12,
      widget: archive.deadletterSize,
    },
  ])
}
