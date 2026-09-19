import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  gcpProject,
  gcpRegion,
  dockerTag,
  tag,
  algoliaSearchKey,
  algoliaAppId,
  htpasswdSecretVersion,
  stackName,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import {
  algoliaFactChecksIndexName,
  algoliaFactChecksOldestIndexName,
} from '../search'
import { recaptchaApiKeyName } from '../recaptcha'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  envoyConfig,
  envoyConfigVersion,
  htpasswdConfig,
  oauth2ProxyConfig,
  oauth2ProxyConfigVersion,
} from './envoy'
import { iamBindings, websiteBackendServiceAccount } from './service-account'
import { backendBucket } from './storage'

const htpasswdSecretVolume = htpasswdSecretVersion
  ? [
      {
        name: 'htpasswd-config-volume',
        secret: {
          secretName: htpasswdConfig.secretId, // The Secret Manager secret name
          items: [
            {
              key: htpasswdSecretVersion, // Version to fetch
              path: 'htpasswd',
            },
          ],
        },
      },
    ]
  : []

const htpasswdSecretMount = htpasswdSecretVersion
  ? [
      {
        name: 'htpasswd-config-volume',
        mountPath: '/etc/secret',
      },
    ]
  : []

const authContainer: pulumi.Input<
  pulumi.Input<gcp.types.input.cloudrun.ServiceTemplateSpecContainer>[]
> =
  stackName === 'dev'
    ? [
        {
          name: 'auth',
          image: 'bitnamilegacy/oauth2-proxy:7.12.0',
          args: [
            '--config=/etc/oauth2-proxy/oauth2-proxy.cfg',
            '--reverse-proxy=true',
            '--request-logging=true',
            '--auth-logging=true',
          ],
          envs: [
            {
              name: 'PORT',
              value: '4180',
            },
          ],
          volumeMounts: [
            {
              name: 'oauth2-proxy-config-volume',
              mountPath: '/etc/oauth2-proxy',
            },
            ...htpasswdSecretMount,
          ],
        },
      ]
    : []

export const factCheckDatabaseBackendService = new gcp.cloudrun.Service(
  `${tag}-fact-check-database-backend-service`,
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
          {
            name: 'oauth2-proxy-config-volume',
            secret: {
              secretName: oauth2ProxyConfig.secretId, // The Secret Manager secret name
              items: [
                {
                  key: oauth2ProxyConfigVersion.version, // Version to fetch
                  path: 'oauth2-proxy.cfg',
                },
              ],
            },
          },
          ...htpasswdSecretVolume,
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
                mountPath: '/etc/envoy',
              },
            ],
          },
          ...authContainer,
          {
            image: getImageUrl('website-server', dockerTag),
            name: 'backend',
            startupProbe: {
              initialDelaySeconds: 10,
              periodSeconds: 5,
              failureThreshold: 3,
              timeoutSeconds: 3,
              httpGet: {
                path: '/health',
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
                name: 'ALGOLIA_INDEX_NAME_OLDEST',
                value: algoliaFactChecksOldestIndexName,
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
                name: 'STORAGE_BUCKET_NAME',
                value: backendBucket.name,
              },
            ],
          },
        ],
      },
    },
  },
  {
    dependsOn: [
      cloudRunService,
      cloudRunArtifactRegistryReader,
      ...iamBindings,
    ],
    provider,
  }
)

export const factCheckDatabasePublicAccess =
  new gcp.cloudrunv2.ServiceIamMember(
    `${tag}-fact-check-database-backend-service-public-access`,
    {
      name: factCheckDatabaseBackendService.name,
      location: gcpRegion,
      role: 'roles/run.invoker',
      member: 'allUsers',
    },
    { provider }
  )
