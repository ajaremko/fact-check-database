/**
 * Schemas for the Google Cloud event payloads that services receive: Pub/Sub
 * push envelopes and Cloud Storage object-finalized notifications.
 *
 * Also importable directly as `@news-research/core-contracts/gcp/v1`.
 */
export * as gcpV1 from './gcp/v1'

/**
 * Schemas for the staging area shared by the ingestion and analysis domains:
 * the fact-checks table definition, its row shape, and the object-path layout
 * under which batches are staged.
 *
 * Also importable directly as `@news-research/core-contracts/staging/v1`.
 */
export * as stagingV1 from './staging/v1'
