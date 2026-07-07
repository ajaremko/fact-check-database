import * as pulumi from '@pulumi/pulumi'

import { gcpProject } from '../config'

import { stagingDataset, stagingFactChecksTable } from './bigquery'

/**
 * The `datasetId` property of the staging dataset.
 */
export const stagingDatasetId = stagingDataset.datasetId

/**
 * The `tableId` property of the staging fact checks table.
 */
export const stagingFactChecksTableId = stagingFactChecksTable.tableId

export const stagingTableRef = pulumi.interpolate`${gcpProject}.${stagingDataset.datasetId}.${stagingFactChecksTable.tableId}`

export * from './loader'
