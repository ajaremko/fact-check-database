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
} from '../../config'
import { storageService } from '../../services'
import { provider } from '../../project'

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
