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
import { recaptchaApiKeyName } from '../recaptcha'

import { formSubmissionTopic } from './topic'

export const websiteService = new gcp.cloudrun.Service(
  `${tag}-website-service`,
  {
    location: gcpRegion,
    metadata: {
      namespace: gcpProject,
      annotations: {
        'run.googleapis.com/container-dependencies': '{"proxy":["backend"]}',
      },
    },
    template: {
      spec: {
        containers: [
          {
            image: getImageUrl('website-proxy', dockerTag),
            name: 'proxy',
            ports: [
              {
                containerPort: 8080,
              },
            ],
          },
          {
            image: getImageUrl('website-server', dockerTag),
            name: 'backend',
            envs: [
              {
                name: 'PORT',
                value: '3000',
              },
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
              {
                name: 'RECAPTCHA_SITE_KEY',
                value: recaptchaApiKeyName,
              },
              {
                name: 'RECAPTCHA_PROJECT_ID',
                value: gcpProject,
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: formSubmissionTopic.name,
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
