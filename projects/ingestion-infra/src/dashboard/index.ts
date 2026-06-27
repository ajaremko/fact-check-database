import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../project'

import { overviewTiles } from './overview'
import { contentIngestionTiles } from './content-ingestion'
import { dataExtractionTiles } from './data-extraction'
import { systemLogsTiles } from './system-logs'
import { messagingTiles } from './messaging'
import { storageTiles } from './storage'

// Section heights: header (4) + content
const OVERVIEW_HEIGHT = 16 // 4 + charts (12)
const CONTENT_INGESTION_HEIGHT = 30 // 4 + tabs (26)
const DATA_EXTRACTION_HEIGHT = 30 // 4 + tabs (26)
const SYSTEM_LOGS_HEIGHT = 30 // 4 + logs panel (26)
const MESSAGING_HEIGHT = 30 // 4 + unacked (13) + publish requests (13)

const OVERVIEW_Y = 0
const CONTENT_INGESTION_Y = OVERVIEW_Y + OVERVIEW_HEIGHT
const DATA_EXTRACTION_Y = CONTENT_INGESTION_Y + CONTENT_INGESTION_HEIGHT
const SYSTEM_LOGS_Y = DATA_EXTRACTION_Y + DATA_EXTRACTION_HEIGHT
const MESSAGING_Y = SYSTEM_LOGS_Y + SYSTEM_LOGS_HEIGHT
const STORAGE_Y = MESSAGING_Y + MESSAGING_HEIGHT

const pipelineDashboardJson = pulumi
  .all([
    overviewTiles(0, OVERVIEW_Y),
    contentIngestionTiles(0, CONTENT_INGESTION_Y),
    dataExtractionTiles(0, DATA_EXTRACTION_Y),
    systemLogsTiles(0, SYSTEM_LOGS_Y),
    messagingTiles(0, MESSAGING_Y),
    storageTiles(0, STORAGE_Y),
  ])
  .apply((sections) => ({
    displayName: 'Ingestion Dashboard (Pulumi)',
    dashboardFilters: [],
    description: 'Ingestion pipeline and operations monitoring',
    labels: {},
    mosaicLayout: {
      columns: 48,
      tiles: sections.flat(),
    },
  }))
  .apply((d) => JSON.stringify(d))

export const pipelineDashboard = new gcp.monitoring.Dashboard(
  `${tag}-dashboard`,
  { dashboardJson: pipelineDashboardJson },
  { provider }
)
