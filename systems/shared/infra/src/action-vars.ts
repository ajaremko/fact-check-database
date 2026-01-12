// import * as github from '@pulumi/github'

// import { githubRepo, stackSuffix } from './config'
// import { githubActionServiceAccount, githubActionOidcProvider } from './oidc'

// export const oidcProviderNameVar = new github.ActionsVariable(
//   'oidc-provider-name-var',
//   {
//     repository: githubRepo,
//     variableName: `OIDC_PROVIDER_NAME_${stackSuffix}`,
//     value: githubActionOidcProvider.name,
//   }
// )

// export const oidcServiceAccountIdVar = new github.ActionsVariable(
//   'oidc-service-account-id-var',
//   {
//     repository: githubRepo,
//     variableName: `OIDC_SERVICE_ACCOUNT_ID_${stackSuffix}`,
//     value: githubActionServiceAccount.id,
//   }
// )
