import * as gcp from '@pulumi/gcp'

import {
  gcpProject,
  gcpRegion,
  dockerTag,
  tag,
  algoliaSearchKey,
  algoliaAppId,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { algoliaFactChecksIndexName } from '../algolia'

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
            envs: [
              {
                name: 'ALGOLIA_APP_ID',
                value: algoliaAppId,
              },
              {
                name: 'ALGOLIA_SEARCH_KEY',
                value: algoliaSearchKey,
              },
              {
                name: 'ALGOLIA_INDEX_NAME',
                value: algoliaFactChecksIndexName,
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
