import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, archiveLocation, archiveTTL } from './config'
import { gcsArchiveKey } from './kms'

const storageServiceAccount = gcp.storage.getProjectServiceAccountOutput({
  project: gcpProject,
})

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
  'raw-archive',
  {
    location: archiveLocation,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
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
