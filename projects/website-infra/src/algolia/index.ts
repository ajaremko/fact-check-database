export * from './loader'

import { algoliaServiceAccount } from './service-account'

export const algoliaServiceAccountEmail = algoliaServiceAccount.email

import { factChecksIndex } from './indices'

export const algoliaFactChecksIndexName = factChecksIndex.name
