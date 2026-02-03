import { ingestorJob } from './cloud-run'

export const helloServiceUrl = ingestorJob.uri

export { gcpProject, ingestionLabels } from './config'
