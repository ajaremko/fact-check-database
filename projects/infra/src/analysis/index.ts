import { stagingToCuratedTransferJob } from './transfer-job'

export const stagingToCuratedTransferJobName = stagingToCuratedTransferJob.name

export {
  curatedDatasetId,
  curatedFactChecksTableId,
  curatedTableRef,
} from './curated'
export {
  stagingDatasetId,
  stagingFactChecksTableId,
  stagingTableRef,
} from './staging'
export {
  gcpProject as analysisGcpProject,
  gcpRegion as analysisGcpRegion,
} from './config'
