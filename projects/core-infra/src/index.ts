export * from './staging-storage'

import {
  githubActionIdentityPoolProvider,
  githubActionServiceAccount,
} from './github-action-runner'

export const githubActionIdentityPoolProviderName =
  githubActionIdentityPoolProvider.name
export const githubActionServiceAccountEmail = githubActionServiceAccount.email

import { bigQueryKey, gcsArchiveKey } from './kms'

export const bigQueryKeyId = bigQueryKey.id
export const bigQueryKeyName = bigQueryKey.name

export const gcsArchiveKeyId = gcsArchiveKey.id
export const gcsArchiveKeyName = gcsArchiveKey.name

import { artifactRegistry } from './artifact-registry'

export const artifactRegistryUri = artifactRegistry.registryUri
export const artifactRegistryLocation = artifactRegistry.location
export const artifactRegistryName = artifactRegistry.name
export const artifactRegistryRepositoryId = artifactRegistry.repositoryId

/**
 * Base URI for the shared Artifact Registry.
 * Example: us-central1-docker.pkg.dev
 */
export const artifactRegistryBaseUri = artifactRegistryUri.apply(
  (uri) => uri.split('/')[0]
)

export { gcpProject, gcpRegion } from './config'
