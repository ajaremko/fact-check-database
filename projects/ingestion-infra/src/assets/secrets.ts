import * as gcp from '@pulumi/gcp'
import * as local from '@pulumi/local'

import { stackName, tag, ingestionLabels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const sourceListSecret = new gcp.secretmanager.Secret(
  `${tag}-source-list-secret`,
  {
    secretId: `${tag}-source-list`,
    labels: ingestionLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

const sourceListFile = local.getFileOutput({
  filename: `assets/sources.${stackName}.yml`,
})

export const sourceListSecretVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-source-list-secret-version`,
  {
    secret: sourceListSecret.id,
    secretData: sourceListFile.content,
  },
  { provider }
)

export const sanitizerPolicySecret = new gcp.secretmanager.Secret(
  `${tag}-sanitizer-policy-secret`,
  {
    secretId: `${tag}-sanitizer-policy`,
    labels: ingestionLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

const sanitizerPolicyFile = local.getFileOutput({
  filename: `assets/sanitizer-policy.${stackName}.yml`,
})

export const sanitizerPolicySecretVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-sanitizer-policy-secret-version`,
  {
    secret: sanitizerPolicySecret.id,
    secretData: sanitizerPolicyFile.content,
  },
  { provider }
)
