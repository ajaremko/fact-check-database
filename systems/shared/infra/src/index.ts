import { githubActionOidcProvider, githubActionServiceAccount } from './oidc'

export const githubActionOidcProviderName = githubActionOidcProvider.name
export const githubActionServiceAccountId = githubActionServiceAccount.id

import { observationsTopic } from './pubsub'

export const observationsTopicName = observationsTopic.name

export { githubOrg, githubRepo } from './config'
