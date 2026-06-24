# Encryption Strategy

This document explains the platform's use of Customer-Managed Encryption Keys (CMEK) for data at rest.

## Why CMEK for Public Data

Although this platform primarily handles publicly available data, we use customer-managed encryption keys rather than Google-managed defaults. This decision is driven by governance requirements, not data sensitivity alone.

**Access revocation without data deletion**
Revoking access to an encryption key immediately renders all encrypted data inaccessible. This allows the platform to cut off access to datasets without needing to locate and delete individual records.

**Incidental PII protection**
Public data sources may contain incidental personally identifiable information (usernames, email addresses in content, etc.). CMEK provides a consistent encryption layer regardless of content.

**Audit trail**
Cloud KMS logs all key usage. This provides an auditable record of which services accessed encrypted data and when.

**Separation of concerns**
Key ownership is separated from data access. Platform administrators control encryption keys through shared infrastructure, while individual systems receive only the permissions needed to encrypt and decrypt their data.

## What Is Encrypted

| Resource             | Encryption Key               | Data Type                  |
| -------------------- | ---------------------------- | -------------------------- |
| `raw-archive-bucket` | `gcs-archive-encryption-key` | Raw ingested observations  |
| BigQuery datasets    | `bigquery-encryption-key`    | Normalized analytical data |

All data written to these resources is automatically encrypted using the specified key. No application-level changes are required.

## Key Configuration

| Property          | Value                      |
| ----------------- | -------------------------- |
| Key ring location | `us` (multi-region)        |
| Rotation period   | 90 days (automatic)        |
| Key purpose       | ENCRYPT_DECRYPT            |
| Key algorithm     | Google-managed (symmetric) |

Keys are defined in shared infrastructure and exported as stack outputs for consumer systems to reference.

## Access Control Model

**Key owners** (shared infrastructure administrators):

- Create and manage key rings and crypto keys
- Control key rotation policy
- Grant and revoke encryption/decryption permissions

**Data accessors** (system service accounts):

- Receive `roles/cloudkms.cryptoKeyEncrypterDecrypter` on specific keys
- Can encrypt and decrypt data using the granted key
- Cannot modify key configuration or grant access to others

Example: The GCS storage service account is granted encrypter/decrypter access to the archive key, allowing it to transparently encrypt objects written to the bucket.

## Access Revocation

To revoke a system's access to encrypted data:

1. Remove the `cryptoKeyEncrypterDecrypter` role binding for that service account
2. The service can no longer decrypt existing data or encrypt new data
3. Data remains encrypted and intact, but inaccessible to the revoked principal

This approach allows access control changes without data migration or deletion.

## What Is Out of Scope

This encryption strategy does not address:

- **PII detection or removal** - Encryption does not identify or redact sensitive content
- **Application-level encryption** - Systems do not implement additional encryption layers
- **Client-side encryption** - Data is encrypted at rest, not in transit from clients
- **Data classification** - No automated labeling of data sensitivity levels
- **Key escrow or recovery** - Keys are managed solely within GCP Cloud KMS

These concerns may be addressed by other platform components or policies, but are not part of the CMEK encryption strategy.
