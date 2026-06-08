export function messagingTiles(x: number, y: number): object[] {
  return [
    {
      yPos: y,
      xPos: x,
      height: 4,
      width: 48,
      widget: {
        title: 'Messaging',
        sectionHeader: {
          dividerBelow: true,
          subtitle: 'Pub/Sub topic and subscription activity',
        },
      },
    },
    {
      yPos: y + 4,
      xPos: x,
      height: 13,
      width: 48,
      widget: {
        title: 'Unacked Messages',
        xyChart: {
          chartOptions: {
            displayHorizontal: false,
            mode: 'COLOR',
          },
          dataSets: [
            {
              minAlignmentPeriod: '60s',
              plotType: 'STACKED_AREA',
              targetAxis: 'Y1',
              timeSeriesQuery: {
                timeSeriesFilter: {
                  aggregation: {
                    alignmentPeriod: '60s',
                    crossSeriesReducer: 'REDUCE_SUM',
                    groupByFields: ['resource.label."subscription_id"'],
                    perSeriesAligner: 'ALIGN_MEAN',
                  },
                  filter:
                    'metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages" resource.type="pubsub_subscription"',
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
      yPos: y + 17,
      xPos: x,
      height: 13,
      width: 48,
      widget: {
        title: 'Publish Requests',
        xyChart: {
          chartOptions: {
            displayHorizontal: false,
            mode: 'COLOR',
          },
          dataSets: [
            {
              minAlignmentPeriod: '60s',
              plotType: 'STACKED_BAR',
              targetAxis: 'Y1',
              timeSeriesQuery: {
                timeSeriesFilter: {
                  aggregation: {
                    alignmentPeriod: '60s',
                    crossSeriesReducer: 'REDUCE_SUM',
                    groupByFields: ['resource.label."topic_id"'],
                    perSeriesAligner: 'ALIGN_COUNT',
                  },
                  filter:
                    'metric.type="pubsub.googleapis.com/topic/send_request_count" resource.type="pubsub_topic"',
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
  ]
}
