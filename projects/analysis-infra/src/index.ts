export {
  gcpProject as analysisGcpProject,
  gcpRegion as analysisGcpRegion,
} from './config'

export * from './curated-dataset'
export * from './staging-dataset'
export * from './alerts'

import { previewServiceAccountViewer } from './preview-access'

export const previewServiceAccountViewerId = previewServiceAccountViewer.apply(
  (binding) => binding?.id
)
