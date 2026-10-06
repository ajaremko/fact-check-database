export { martsDatasetId, martsFactChecksTableId } from './marts'
export {
  gcpProject as researchGcpProject,
  gcpRegion as researchGcpRegion,
} from './config'

import { previewServiceAccountViewer } from './preview-access'

export const previewServiceAccountViewerId = previewServiceAccountViewer.apply(
  (binding) => binding?.id
)
