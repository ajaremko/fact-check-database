import * as gcp from '@pulumi/gcp'

import { sharedLabels, kmsLocation } from './config'
import { kmsService } from './services'
import { provider } from './provider'

export const keyRing = new gcp.kms.KeyRing(
  'key-ring',
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
  'gcs-archive-encryption-key',
  {
    keyRing: keyRing.id,
    rotationPeriod: '7776000s', // 90 days
    purpose: 'ENCRYPT_DECRYPT',
    labels: sharedLabels,
  },
  {
    provider,
  }
)

/**
 * CryptoKey for bigquery encryption
 */
export const bigQueryKey = new gcp.kms.CryptoKey(
  'bigquery-encryption-key',
  {
    keyRing: keyRing.id,
    rotationPeriod: '7776000s',
    purpose: 'ENCRYPT_DECRYPT',
    labels: sharedLabels,
  },
  {
    provider,
  }
)
