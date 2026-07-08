import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, stagingStorageBucketName, tag } from '../../config'
import { provider } from '../../project'

import { algoliaApiKeySecret } from './secrets'

export const searchIndexLoaderServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-search-loader-sa`,
  {
    accountId: `${tag}-search-loader-sa`,
    displayName: 'Search Index Loader (Website)',
  },
  { provider }
)

const searchIndexLoaderStagingBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-search-loader-staging-bucket-viewer`,
  {
    bucket: stagingStorageBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${searchIndexLoaderServiceAccount.email}`,
  },
  { provider }
)

export const secretAccessorBinding = new gcp.secretmanager.SecretIamMember(
  `${tag}-search-loader-secret-accessor`,
  {
    secretId: algoliaApiKeySecret.secretId,
    role: 'roles/secretmanager.secretAccessor',
    member: pulumi.interpolate`serviceAccount:${searchIndexLoaderServiceAccount.email}`,
  },
  { provider }
)

const searchIndexLoaderCloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-search-loader-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${searchIndexLoaderServiceAccount.email}`,
  },
  { provider }
)

const searchIndexLoaderTelemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-search-loader-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${searchIndexLoaderServiceAccount.email}`,
  },
  { provider }
)

export const searchIndexLoaderServiceAccountIamRoles = [
  searchIndexLoaderStagingBucketViewer,
  searchIndexLoaderCloudtraceAgent,
  searchIndexLoaderTelemetryTracesWriter,
]
