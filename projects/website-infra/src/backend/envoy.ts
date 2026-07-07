import * as gcp from '@pulumi/gcp'
import * as local from '@pulumi/local'
import * as pulumi from '@pulumi/pulumi'
import * as random from '@pulumi/random'

import { stackName, tag, websiteLabels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const envoyConfig = new gcp.secretmanager.Secret(
  `${tag}-envoy-config`,
  {
    secretId: 'website-envoy-config',
    labels: websiteLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

const envoyConfigFile = local.getFileOutput({
  filename: `backend/envoy.${stackName}.yaml`,
})

export const envoyConfigVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-envoy-config-version`,
  {
    secret: envoyConfig.id,
    secretData: envoyConfigFile.content,
  },
  { provider }
)

export const htpasswdConfig = new gcp.secretmanager.Secret(
  `${tag}-htpasswd-config`,
  {
    secretId: 'website-htpasswd-config',
    labels: websiteLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

export const oauth2ProxyConfig = new gcp.secretmanager.Secret(
  `${tag}-oauth2-proxy-config`,
  {
    secretId: 'website-oauth2-proxy-config',
    labels: websiteLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)

const oauth2ProxyConfigFile = local.getFileOutput({
  filename: `backend/oauth2-proxy.cfg`,
})

const clientSecret = new random.RandomPassword(
  `${tag}-oauth2-proxy-client-secret`,
  {
    length: 32,
    special: true,
    overrideSpecial: '!@#$%^&*()_+=-[]{}|;:,.<>/?',
  },
  {
    additionalSecretOutputs: ['result'],
  }
)

const cookieSecret = new random.RandomPassword(
  `${tag}-oauth2-proxy-cookie-secret`,
  {
    length: 32,
    special: true,
    overrideSpecial: '!@#$%^&*()_+=-[]{}|;:,.<>/?',
  },
  {
    additionalSecretOutputs: ['result'],
  }
)

const oauth2ProxyConfigData = pulumi.interpolate`${oauth2ProxyConfigFile.content}\nclient_secret = "${clientSecret.result}"\ncookie_secret = "${cookieSecret.result}"`

export const oauth2ProxyConfigVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-oauth2-proxy-config-version`,
  {
    secret: oauth2ProxyConfig.id,
    secretData: oauth2ProxyConfigData,
  },
  { provider }
)
