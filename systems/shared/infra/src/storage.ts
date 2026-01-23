import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, archiveLocation, archiveTTL, labels } from './config'
import { gcsArchiveKey } from './kms'
import { storageService } from './services'

const storageServiceAccount = gcp.storage.getProjectServiceAccountOutput(
  {
    project: gcpProject,
  },
  {
    dependsOn: [storageService],
  }
)

/**
 * Allow storage service account to use the KMS key for encryption/decryption
 */
export const storageServiceAccountKmsBinding = new gcp.kms.CryptoKeyIAMMember(
  'gcs-sa-kms-binding',
  {
    cryptoKeyId: gcsArchiveKey.id,
    role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
    member: pulumi.interpolate`serviceAccount:${storageServiceAccount.emailAddress}`,
  }
)

export const rawArchiveBucket = new gcp.storage.Bucket(
  'raw-archive-bucket',
  {
    location: archiveLocation,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels,
    encryption: {
      defaultKmsKeyName: gcsArchiveKey.id,
    },
    lifecycleRules: [
      {
        action: { type: 'Delete' },
        condition: {
          age: archiveTTL,
        },
      },
    ],
  },
  {
    dependsOn: [storageServiceAccountKmsBinding],
  }
)
