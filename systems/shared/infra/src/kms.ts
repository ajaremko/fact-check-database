import * as gcp from '@pulumi/gcp'

import { gcpLocation } from './config'

export const keyRing = new gcp.kms.KeyRing('key-ring', {
  location: gcpLocation,
})

/**
 * CryptoKey for GCS bucket encryption
 */
export const gcsArchiveKey = new gcp.kms.CryptoKey(
  'gcs-archive-encryption-key',
  {
    keyRing: keyRing.id,
    rotationPeriod: '7776000s', // 90 days
    purpose: 'ENCRYPT_DECRYPT',
  }
)

/**
 * CryptoKey for bigquery encryption
 */
export const bigQueryKey = new gcp.kms.CryptoKey('bigquery-encryption-key', {
  keyRing: keyRing.id,
  rotationPeriod: '7776000s',
  purpose: 'ENCRYPT_DECRYPT',
})
