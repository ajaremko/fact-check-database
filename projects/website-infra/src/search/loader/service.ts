import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  gcpProject,
  dockerTag,
  tag,
  logLevel,
  algoliaAppId,
} from '../../config'
import { provider } from '../../project'
import { cloudRunService } from '../../services'
import { getImageUrl } from '../../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../../iam'

import { factChecksIndex } from '../indices'

import {
  searchIndexLoaderServiceAccount,
  searchIndexLoaderServiceAccountIamRoles,
} from './service-account'
import { algoliaApiKeySecret, algoliaApiKeySecretVersion } from './secrets'

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-search-loader-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: searchIndexLoaderServiceAccount.email,
      containers: [
        {
          image: getImageUrl('website-loader', dockerTag),
          envs: [
            {
              name: 'ALGOLIA_API_KEY',
              valueSource: {
                secretKeyRef: {
                  secret: algoliaApiKeySecret.secretId,
                  version: algoliaApiKeySecretVersion.version,
                },
              },
            },
            {
              name: 'ALGOLIA_APP_ID',
              value: algoliaAppId,
            },
            {
              name: 'ALGOLIA_INDEX_NAME',
              value: factChecksIndex.name,
            },
            {
              name: 'LOGGING_LEVEL',
              value: logLevel,
            },
            {
              name: 'GOOGLE_CLOUD_PROJECT',
              value: gcpProject,
            },
            {
              name: 'OTEL_CLOUD_MONITORING_PREFIX',
              value: `workload.googleapis.com/${tag}/`,
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunArtifactRegistryReader,
      cloudRunService,
      ...searchIndexLoaderServiceAccountIamRoles,
    ],
    provider,
  }
)
