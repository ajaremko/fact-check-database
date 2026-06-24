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

import { envoyConfig, envoyConfigVersion } from './envoy'
import { iamMembers, websiteBackendServiceAccount } from './service-account'
import { formSubmissionTopic } from './topic'

export const websiteService = new gcp.cloudrun.Service(
  `${tag}-backend-service`,
  {
    location: gcpRegion,
    metadata: {
      namespace: gcpProject,
      annotations: {
        // 'run.googleapis.com/container-dependencies': '{"proxy":["backend"]}',
      },
    },
    template: {
      spec: {
        serviceAccountName: websiteBackendServiceAccount.email,
        volumes: [
          {
            name: 'envoy-config-volume',
            secret: {
              secretName: envoyConfig.secretId, // The Secret Manager secret name
              items: [
                {
                  key: envoyConfigVersion.version, // Version to fetch
                  path: 'envoy.yaml',
                },
              ],
            },
          },
        ],
        containers: [
          {
            image: 'envoyproxy/envoy:v1.30.0',
            name: 'proxy',
            ports: [
              {
                containerPort: 8080,
              },
            ],
            volumeMounts: [
              {
                name: 'envoy-config-volume',
                mountPath: '/etc/envoy', // The directory where files will appear
              },
            ],
          },
          {
            image: getImageUrl('website-server', dockerTag),
            name: 'backend',
            startupProbe: {
              initialDelaySeconds: 10,
              periodSeconds: 5,
              failureThreshold: 3,
              timeoutSeconds: 3,
              httpGet: {
                path: '/',
              },
            },
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
    dependsOn: [cloudRunService, ...iamMembers],
    provider,
  }
)

export const publicAccess = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-backend-service-public-access`,
  {
    name: websiteService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider }
)

export const websiteUrl = websiteService.statuses[0].url
