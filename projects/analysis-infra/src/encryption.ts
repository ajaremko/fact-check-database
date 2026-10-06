import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { bigQueryKeyId, gcpProject, tag } from './config'
import { provider } from './project'

/**
 * BigQuery's own service agent for this project. BigQuery encrypts and
 * decrypts table data as this identity, so it is the only one that needs to
 * use the key: the loader, the scheduled query and research readers keep
 * working with their BigQuery roles alone.
 */
const bigQueryServiceAgent = gcp.bigquery.getDefaultServiceAccountOutput(
  { project: gcpProject },
  { provider }
)

/**
 * Allow BigQuery to encrypt and decrypt this project's tables with the
 * customer-managed key. Removing this grant, or disabling the key, makes the
 * tables unreadable: that is the revocation switch for the datasets.
 */
export const bigQueryServiceAgentKmsBinding = new gcp.kms.CryptoKeyIAMMember(
  `${tag}-bigquery-sa-kms-binding`,
  {
    cryptoKeyId: bigQueryKeyId,
    role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
    member: pulumi.interpolate`serviceAccount:${bigQueryServiceAgent.email}`,
  },
  { provider }
)

/**
 * The encryption settings every dataset and table in this stack carries.
 */
export const bigQueryEncryption = { kmsKeyName: bigQueryKeyId }
