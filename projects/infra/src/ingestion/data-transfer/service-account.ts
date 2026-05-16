import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../config'
import { provider } from '../project'

export const dataTransferServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-gcs-data-transfer-sa`,
  {
    accountId: `${tag}-gcs-data-transfer-sa`,
    displayName: 'GCS Data Transfer Service Account',
  },
  { provider }
)

export const dataTransferStorageAdmin = new gcp.projects.IAMMember(
  `${tag}-gcs-data-transfer-storage-admin`,
  {
    role: 'roles/storage.admin',
    member: pulumi.interpolate`serviceAccount:${dataTransferServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const dataTransferPubsubPublisher = new gcp.projects.IAMMember(
  `${tag}-gcs-data-transfer-pubsub-publisher`,
  {
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${dataTransferServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)
