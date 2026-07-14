export * from './loader'

import { algoliaServiceAccount } from './service-account'

export const algoliaServiceAccountEmail = algoliaServiceAccount.email

import { factChecksIndex, factChecksOldestIndex } from './indices'

export const algoliaFactChecksIndexName = factChecksIndex.name
export const algoliaFactChecksOldestIndexName = factChecksOldestIndex.name
