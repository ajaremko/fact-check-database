import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, archiveLocation, archiveTTL, sharedLabels } from './config'
import { gcsArchiveKey } from './kms'
import { storageService } from './services'
import { provider } from './provider'

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
  'gcs-sa-kms-binding',
  {
    cryptoKeyId: gcsArchiveKey.id,
    role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
    member: pulumi.interpolate`serviceAccount:${storageServiceAccount.emailAddress}`,
  },
  { provider }
)

export const rawArchiveBucket = new gcp.storage.Bucket(
  'raw-archive-bucket',
  {
    location: archiveLocation,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: sharedLabels,
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
    provider,
  }
)
