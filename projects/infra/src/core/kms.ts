import * as gcp from '@pulumi/gcp'

import { coreLabels, kmsLocation, tag } from './config'
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
 * CryptoKey for bigquery encryption
 */
export const bigQueryKey = new gcp.kms.CryptoKey(
  `${tag}-bigquery-encryption-key`,
  {
    keyRing: keyRing.id,
    rotationPeriod: '7776000s',
    purpose: 'ENCRYPT_DECRYPT',
    labels: coreLabels,
  },
  {
    provider,
  }
)
