import * as pulumi from '@pulumi/pulumi'

import { gcpProject } from '../config'

import { curatedDataset, curatedFactChecksTable } from './bigquery'

export const curatedDatasetId = curatedDataset.datasetId
export const curatedFactChecksTableId = curatedFactChecksTable.tableId

export const curatedTableRef = pulumi.interpolate`${gcpProject}.${curatedDataset.datasetId}.${curatedFactChecksTable.tableId}`
