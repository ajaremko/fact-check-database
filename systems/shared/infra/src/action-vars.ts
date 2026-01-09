import * as github from '@pulumi/github'

import { githubRepo, stackSuffix } from './config'
import { githubActionOidcProvider } from './oidc'

export const oidcProviderNameVar = new github.ActionsVariable(
  'oidc-provider-name-var',
  {
    repository: githubRepo,
    variableName: `OIDC_PROVIDER_NAME_${stackSuffix}`,
    value: githubActionOidcProvider.name,
  }
)
