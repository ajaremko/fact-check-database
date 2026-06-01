import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion, dockerTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'

export const websiteService = new gcp.cloudrun.Service(
  `${tag}-website-service`,
  {
    location: gcpRegion,
    metadata: {
      namespace: gcpProject,
    },
    template: {
      spec: {
        containers: [
          {
            image: getImageUrl('website-server', dockerTag),
          },
        ],
      },
    },
  },
  {
    dependsOn: [cloudRunService],
    provider,
  }
)

export const publicAccess = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-website-service-public-access`,
  {
    name: websiteService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider }
)

export const websiteUrl = websiteService.statuses[0].url
