import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  gcpRegion,
  ingestionLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
  gcpProject,
  deadletterRetentionDays,
  eventLogRetentionDays,
  batchRetentionDays,
} from './config'
import { storageService } from './services'
import { provider } from './provider'

import { gcsArchiveKeyId } from '../core'

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

export const rawArchiveBucket = new gcp.storage.Bucket(
  `${tag}-raw-archive-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: true,
    encryption: {
      defaultKmsKeyName: gcsArchiveKeyId,
    },
  },
  {
    dependsOn: [storageServiceAccountKmsBinding],
    retainOnDelete: true,
    provider,
  }
)

export const assetsBucket = new gcp.storage.Bucket(
  `${tag}-assets-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: ingestionLabels,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)

export const stagingBucket = new gcp.storage.Bucket(
  `${tag}-staging-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: forceDestroyStorage,
    lifecycleRules: batchRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: { age: batchRetentionDays },
          },
        ]
      : undefined,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)

export const eventLogBucket = new gcp.storage.Bucket(
  `${tag}-event-log-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: ingestionLabels,
    forceDestroy: forceDestroyStorage,
    lifecycleRules: eventLogRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: {
              matchesPrefixes: ['sanitizer-events/', 'extractor-events/'],
              age: eventLogRetentionDays,
            },
          },
        ]
      : undefined,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)
