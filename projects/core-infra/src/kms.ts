import * as gcp from '@pulumi/gcp'

import { bigQueryKmsLocation, coreLabels, kmsLocation, tag } from './config'
import { kmsService } from './services'
import { provider } from './project'

export const keyRing = new gcp.kms.KeyRing(
  `${tag}-key-ring`,
  {
    location: kmsLocation,
  },
  {
    dependsOn: [kmsService],
    provider,
  }
)

/**
 * CryptoKey for GCS bucket encryption
 */
export const gcsArchiveKey = new gcp.kms.CryptoKey(
  `${tag}-gcs-archive-encryption-key`,
  {
    keyRing: keyRing.id,
    rotationPeriod: '7776000s', // 90 days
    purpose: 'ENCRYPT_DECRYPT',
    labels: coreLabels,
  },
  {
    provider,
  }
)

/**
 * Key ring for the BigQuery key. It is separate from `keyRing` because a key
 * ring's location is fixed, and BigQuery needs its key in the same location
 * as the datasets it encrypts.
 */
export const bigQueryKeyRing = new gcp.kms.KeyRing(
  `${tag}-bigquery-key-ring`,
  {
    location: bigQueryKmsLocation,
  },
  {
    dependsOn: [kmsService],
    provider,
  }
)

/**
 * CryptoKey for bigquery encryption
 */
export const bigQueryKey = new gcp.kms.CryptoKey(
  `${tag}-bigquery-encryption-key`,
  {
    keyRing: bigQueryKeyRing.id,
    rotationPeriod: '7776000s',
    purpose: 'ENCRYPT_DECRYPT',
    labels: coreLabels,
  },
  {
    provider,
  }
)
