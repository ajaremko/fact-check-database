export * from './algolia'

export {
  gcpProject as websiteGcpProject,
  gcpRegion as websiteGcpRegion,
  dockerTag as websiteDockerTag,
  verifiedDomains as websiteVerifiedDomains,
} from './config'
export { websiteUrl } from './server/service'
