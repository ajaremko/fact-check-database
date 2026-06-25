import * as gcp from '@pulumi/gcp'
import * as local from '@pulumi/local'

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

const configFile = local.getFileOutput({
  filename: `backend/envoy.${stackName}.yaml`,
})

export const envoyConfigVersion = new gcp.secretmanager.SecretVersion(
  `${tag}-envoy-config-version`,
  {
    secret: envoyConfig.id,
    secretData: configFile.content,
  },
  { provider }
)
