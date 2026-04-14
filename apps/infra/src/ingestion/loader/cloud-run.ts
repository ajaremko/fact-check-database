import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry, rawArchiveBucketName } from '../../core'

import { gcpRegion, sanitizerTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { stagingBucket } from '../storage'

const loaderServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-sa`,
  {
    accountId: `${tag}-loader-sa`,
    displayName: 'Loader Service Account',
  },
  { provider }
)

export const loaderStagingBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-loader-staging-bucket-viewer`,
  {
    bucket: stagingBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)

// If an sanitizer image is specified in config, use that. Otherwise, fall back to a public sample image.
function getSanitizerImageUri(tag?: string): pulumi.Output<string> {
  if (!tag) {
    console.warn(
      'No sanitizerTag specified in config, using public sample image.'
    )
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistry.location,
      repositoryId: artifactRegistry.repositoryId,
      imageName: `apps-loader:${tag}`,
    },
    { provider }
  )

  return image.selfLink
}

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-loader-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    launchStage: 'BETA',
    template: {
      serviceAccount: loaderServiceAccount.email,
      containers: [
        {
          image: getSanitizerImageUri(sanitizerTag),
          envs: [
            {
              name: 'STORAGE_BUCKET_NAME',
              value: rawArchiveBucketName,
            },
            {
              name: 'LOG_LEVEL',
              value: 'error',
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [cloudRunService, loaderStagingBucketViewer],
    provider,
  }
)
