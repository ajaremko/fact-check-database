import { ingestorService } from './cloud-run'

export const helloServiceUrl = ingestorService.uri

export { gcpProject, ingestionLabels } from './config'
