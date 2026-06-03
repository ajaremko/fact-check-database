import * as pulumi from '@pulumi/pulumi'

import { gcpProject } from '../config'

import { stagingDataset, stagingFactChecksTable } from './bigquery'

export const stagingDatasetId = stagingDataset.datasetId
export const stagingFactChecksTableId = stagingFactChecksTable.tableId

export const stagingTableRef = pulumi.interpolate`${gcpProject}.${stagingDataset.datasetId}.${stagingFactChecksTable.tableId}`

export * from './loader'
