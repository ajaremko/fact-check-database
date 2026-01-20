import * as github from '@pulumi/github'

import { githubRepo, stackSuffix } from '../config'

import { githubActionIdentityPoolProvider } from './identity-pool-provider'
import { githubActionServiceAccount } from './service-account'

export const githubActionIdentityPoolProviderNameVar =
  new github.ActionsVariable('github-actions-identity-pool-provider-name-var', {
    repository: githubRepo,
    variableName: `WORKLOAD_IDENTITY_PROVIDER_${stackSuffix}`,
    value: githubActionIdentityPoolProvider.name,
  })

export const githubActionServiceAccountIdVar = new github.ActionsVariable(
  'github-actions-service-account-id-var',
  {
    repository: githubRepo,
    variableName: `WORKLOAD_SERVICE_ACCOUNT_${stackSuffix}`,
    value: githubActionServiceAccount.email,
  }
)
