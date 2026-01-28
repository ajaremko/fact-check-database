import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion } from './config'

export const provider = new gcp.Provider('ingestion', {
  project: gcpProject,
  region: gcpRegion,
})
