import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion, tag, mainDomain } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'

export const redirectService = new gcp.cloudrun.Service(
  `${tag}-redirect-service`,
  {
    location: gcpRegion,
    metadata: {
      namespace: gcpProject,
    },
    template: {
      spec: {
        containers: [
          {
            // See https://hub.docker.com/r/morbz/docker-web-redirect/
            image: 'morbz/docker-web-redirect:v1.0',
            envs: [
              {
                name: 'REDIRECT_TARGET',
                value: mainDomain,
              },
            ],
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
  `${tag}-redirect-service-public-access`,
  {
    name: redirectService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider }
)

export const redirectUrl = redirectService.statuses[0].url
