import * as path from 'node:path'

import * as gcp from '@pulumi/gcp'
import * as local from '@pulumi/local'
import * as pulumi from '@pulumi/pulumi'

import { stackName, tag, ingestionLabels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

// The source list and the sanitizer policy are kept for every environment in
// one directory at the repository root. This project sits two levels below it.
const configFile = (name: string) =>
  path.resolve(
    pulumi.getRootDirectory(),
    '../../config',
    `${name}.${stackName}.yml`
  )

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
  filename: configFile('sources'),
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
  filename: configFile('sanitizer-policy'),
})

export const sanitizerPolicySecretVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-sanitizer-policy-secret-version`,
  {
    secret: sanitizerPolicySecret.id,
    secretData: sanitizerPolicyFile.content,
  },
  { provider }
)
