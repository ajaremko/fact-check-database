# Encryption Strategy

Why this project provisions Customer-Managed Encryption Keys (CMEK) rather than relying on
Google-managed defaults, even though the platform primarily handles public data.

## Why CMEK for public data

- **Access revocation without data deletion.** Revoking a service account's access to a key
  makes every object it encrypted unreadable immediately, without needing to locate and delete
  individual records.
- **Incidental PII.** A public source can carry incidental personal information — a name or
  email address embedded in article content. CMEK applies a consistent encryption layer
  regardless of content, rather than depending on that content being classified first.
- **Audit trail.** Cloud KMS logs every key operation, giving an auditable record of when
  encrypted data was accessed and by what.
- **Separation of duties.** Key ownership stays with this project; each consuming project
  receives only `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the one key it needs, never
  key-management permissions.

## The keys

Both live in one key ring (`core-key-ring`), with 90-day automatic rotation and
`ENCRYPT_DECRYPT` purpose.

| Key                          | Currently protects                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gcs-archive-encryption-key` | `ingestion-infra`'s raw archive bucket. The encrypter/decrypter grant to that bucket's GCS service account is created in `ingestion-infra` (`storageServiceAccountKmsBinding`), not here — this project only owns the key.                                                                                                                         |
| `bigquery-encryption-key`    | Nothing currently. It is provisioned and exported (`bigQueryKeyId` / `bigQueryKeyName`), but no BigQuery dataset in `analysis-infra` or `research-infra` sets any encryption config referencing it. If a future dataset needs CMEK, this is the key to use — until then, treat it as unused rather than assume BigQuery data is encrypted with it. |

## Access model

- **Key owner** (this project): creates the key ring and keys, sets rotation policy, grants and
  revokes encrypter/decrypter access.
- **Data accessor** (a consuming project's own service account): receives
  `roles/cloudkms.cryptoKeyEncrypterDecrypter` on one key, granted by that project's own IAM
  code. It can encrypt and decrypt; it cannot change key configuration or grant access to anyone
  else.

To revoke a system's access, remove its `cryptoKeyEncrypterDecrypter` binding in the project that
created it. The service can no longer read or write encrypted data; the data itself is untouched.

## Out of scope

CMEK encrypts data at rest. It does not detect or redact PII in content, classify data
sensitivity, encrypt data in transit, or provide key escrow — Cloud KMS is the sole store for
these keys.
