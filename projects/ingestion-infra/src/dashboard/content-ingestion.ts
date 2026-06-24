import { gcpProject } from '../config'

const timezone = 'America/Los_Angeles'

const tabGroup = {
  title: 'Content Ingestion',
  singleViewGroup: { displayType: 'TAB' },
}

const ingestorJobRunsWidget = {
  title: 'Job Runs',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', timestamp, '${timezone}') AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', timestamp, '${timezone}') AS Time,
                STRING(json_payload.serviceContext.version) AS Version,
                INT64(json_payload['job.tasks']) AS Sources,
                INT64(json_payload['job.failures']) AS Failures,
                FLOAT64(json_payload['job.successThreshold']) AS \`Success Threshold\`,
                STRING(json_payload['job.result']) AS Result
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                AND JSON_VALUE(json_payload, '$.event') = 'ingestor_job_completed'
              ORDER BY timestamp DESC
              LIMIT 50`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const archivedRequestsWidget = {
  title: 'Archived Requests',
  timeSeriesTable: {
    columnSettings: [],
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', MAX(timestamp), '${timezone}') AS Time,
                STRING(json_payload['source.id'])           AS \`Source ID\`,
                STRING(json_payload['source.name'])         AS Name,
                STRING(json_payload['source.url'])          AS URL,
                STRING(json_payload['source.collection'])   AS Collection,
                STRING(json_payload['result.status'])       AS Status,
                INT64(json_payload['result.status_code'])   AS Code,
                STRING(json_payload['result.content_type']) AS \`Content Type\`,
                COUNT(*)                                    AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND JSON_VALUE(json_payload, '$.event') = 'fetch_success'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-ingestor'
              GROUP BY Name, \`Source ID\`, Collection, URL, Status, Code, \`Content Type\`
              ORDER BY Date, Time, Name, Code
              LIMIT 1000`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const failedRequestsWidget = {
  title: 'Failed Requests',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', MAX(timestamp), '${timezone}') AS Time,
                STRING(json_payload['source.id'])         AS \`Source ID\`,
                STRING(json_payload['source.name'])       AS Name,
                STRING(json_payload['source.collection']) AS Collection,
                STRING(json_payload['source.url'])        AS URL,
                STRING(json_payload['result.error'])      AS Error,
                COUNT(*)                                  AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND severity = 'WARNING'
                AND JSON_VALUE(json_payload, '$.event') = 'fetch_failure'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-ingestor'
              GROUP BY Name, \`Source ID\`, Collection, URL, Error
              ORDER BY Name`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

const sanitizerDecisionsWidget = {
  title: 'Sanitizer Decisions',
  timeSeriesTable: {
    dataSets: [
      {
        minAlignmentPeriod: '60s',
        timeSeriesQuery: {
          opsAnalyticsQuery: {
            queryHandle: '',
            sql: `
              SELECT
                FORMAT_TIMESTAMP('%x', MAX(timestamp), '${timezone}')       AS Date,
                FORMAT_TIMESTAMP('%I:%M %p', MAX(timestamp), '${timezone}') AS Time,
                STRING(json_payload['source.id'])         AS \`Source ID\`,
                STRING(json_payload['source.name'])       AS Name,
                STRING(json_payload['source.url'])        AS URL,
                STRING(json_payload['source.collection']) AS Collection,
                STRING(json_payload['decision.label'])   AS Decision,
                COUNT(*)                                  AS Count
              FROM \`${gcpProject}.global._Default._Default\`
              WHERE
                timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
                AND severity = 'INFO'
                AND JSON_VALUE(json_payload, '$.event') = 'record_sanitized'
                AND JSON_VALUE(json_payload, '$.serviceContext.service') = '@news-research/ingestion-pipeline-sanitizer'
              GROUP BY Name, \`Source ID\`, Collection, URL, Decision
              ORDER BY Name, Decision`,
          },
        },
      },
    ],
    metricVisualization: 'BAR',
  },
}

export function contentIngestionTiles(x: number, y: number): object[] {
  const tabY = y + 4
  const tabHeight = 26

  const tab = (widget: object) => ({
    yPos: tabY,
    xPos: x,
    height: tabHeight,
    width: 48,
    widget,
  })

  return [
    {
      yPos: y,
      xPos: x,
      height: 4,
      width: 48,
      widget: {
        title: 'Content Ingestion',
        sectionHeader: {
          dividerBelow: true,
          subtitle: 'HTTP fetch results, sanitizer decisions, and source activity',
        },
      },
    },
    tab(tabGroup),
    tab(ingestorJobRunsWidget),
    tab(archivedRequestsWidget),
    tab(failedRequestsWidget),
    tab(sanitizerDecisionsWidget),
  ]
}
