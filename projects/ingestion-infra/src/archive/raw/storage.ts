import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  gcpRegion,
  gcsArchiveKeyId,
  ingestionLabels,
  tag,
  gcpProject,
  forceDestroyStorage,
  retainStorageOnDelete,
  archiveNearlineAfterDays,
  archiveColdlineAfterDays,
} from '../../config'
import { storageService } from '../../services'
import { provider } from '../../project'

import { archiveLifecycleRules } from './lifecycle'

const storageServiceAccount = gcp.storage.getProjectServiceAccountOutput(
  {
    project: gcpProject,
  },
  {
    dependsOn: [storageService],
    provider,
  }
)

/**
 * Allow storage service account to use the KMS key for encryption/decryption
 */
export const storageServiceAccountKmsBinding = new gcp.kms.CryptoKeyIAMMember(
  `${tag}-gcs-sa-kms-binding`,
  {
    cryptoKeyId: gcsArchiveKeyId,
    role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
    member: pulumi.interpolate`serviceAccount:${storageServiceAccount.emailAddress}`,
  },
  { provider }
)

export const archiveBucket = new gcp.storage.Bucket(
  `${tag}-archive-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: forceDestroyStorage,
    // Moves ageing objects to cheaper storage classes when the stack sets the
    // ages. Nothing here deletes: the archive is a permanent record.
    lifecycleRules: archiveLifecycleRules({
      nearlineAfterDays: archiveNearlineAfterDays,
      coldlineAfterDays: archiveColdlineAfterDays,
    }),
    encryption: {
      defaultKmsKeyName: gcsArchiveKeyId,
    },
  },
  {
    dependsOn: [storageServiceAccountKmsBinding],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)
