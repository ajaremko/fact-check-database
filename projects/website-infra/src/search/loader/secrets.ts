// eslint-disable-next-line @nx/enforce-module-boundaries
import * as algolia from '@pulumi/algolia'
import * as gcp from '@pulumi/gcp'

import { tag, websiteLabels } from '../../config'
import { provider } from '../../project'
import { secretManagerService } from '../../services'

import { factChecksIndex } from '../indices'

export const algoliaApiKeySecret = new gcp.secretmanager.Secret(
  `${tag}-search-loader-algolia-api-key-secret`,
  {
    secretId: 'website-search-loader-algolia-api-key',
    labels: websiteLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

export const algoliaApiKey = new algolia.ApiKey(
  `${tag}-search-loader-algolia-api-key`,
  {
    description: 'API key for the Algolia loader service',
    acls: ['addObject', 'deleteIndex', 'editSettings'],
    indexes: [factChecksIndex.name],
  }
)

export const algoliaApiKeySecretVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-search-loader-algolia-api-key-secret-version`,
  {
    secret: algoliaApiKeySecret.id,
    secretData: algoliaApiKey.key,
  },
  { provider }
)
