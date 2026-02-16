import {
  githubActionIdentityPoolProvider,
  githubActionServiceAccount,
} from './github-action-runner'

export const githubActionIdentityPoolProviderName =
  githubActionIdentityPoolProvider.name
export const githubActionServiceAccountEmail = githubActionServiceAccount.email

import { observationsTopic } from './pubsub'

export const observationsTopicName = observationsTopic.name
export const observationsTopicId = observationsTopic.id

import { bigQueryKey, gcsArchiveKey } from './kms'

export const bigQueryKeyName = bigQueryKey.name
export const gcsArchiveKeyName = gcsArchiveKey.name

import { artifactRegistry } from './artifact-registry'

export const artifactRegistryUri = artifactRegistry.registryUri
/**
 * Base URI for the shared Artifact Registry.
 * Example: us-central1-docker.pkg.dev
 */
export const artifactRegistryBaseUri = artifactRegistryUri.apply(
  (uri) => uri.split('/')[0]
)

export { artifactRegistry } from './artifact-registry'

import { rawArchiveBucket } from './storage'

export const rawArchiveBucketName = rawArchiveBucket.name

export { gcpProject, coreLabels } from './config'
