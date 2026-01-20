import {
  githubActionIdentityPoolProvider,
  githubActionServiceAccount,
} from './github-action-runner'

export const githubActionIdentityPoolProviderName =
  githubActionIdentityPoolProvider.name
export const githubActionServiceAccountEmail = githubActionServiceAccount.email

import { observationsTopic } from './pubsub'

export const observationsTopicName = observationsTopic.name

import { bigQueryKey, gcsArchiveKey } from './kms'

export const bigQueryKeyName = bigQueryKey.name
export const gcsArchiveKeyName = gcsArchiveKey.name

import { rawArchiveBucket } from './storage'

export const rawArchiveBucketName = rawArchiveBucket.name

export * from './config'
