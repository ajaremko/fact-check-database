import { helloService } from './cloud-run'

export const helloServiceUrl = helloService.uri

export { gcpProject, ingestionLabels } from './config'
