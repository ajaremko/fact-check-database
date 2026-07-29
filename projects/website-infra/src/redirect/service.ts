import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion, tag, mainDomain, stackName } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { factCheckDatabaseBackendUrl } from '../backend'

const envs =
  stackName === 'dev'
    ? [
        {
          name: 'REDIRECT_TARGET',
          value: factCheckDatabaseBackendUrl,
        },
      ]
    : [
        {
          name: 'REDIRECT_TARGET',
          value: mainDomain,
        },
      ]

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
            envs: envs,
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
