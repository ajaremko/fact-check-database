import { curatedDataset, curatedFactChecksTable } from './bigquery'

export const curatedDatasetId = curatedDataset.datasetId
export const curatedFactChecksTableId = curatedFactChecksTable.tableId

export { curatedTableRef } from './bigquery'

import { stagingToCuratedTransferJob } from './transfer-job'

export const transferJobName = stagingToCuratedTransferJob.name