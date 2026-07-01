/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from 'effect'
import type { StorageObjectData as StorageObjectDataInternal } from '@google/events/cloud/storage/v1/StorageObjectData'

type Unnest<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Record<string, any> ? Unnest<T[K]> : T[K]
}

function makeStorageObjectDataFields<
  Fields extends Record<keyof StorageObjectDataInternal, Schema.Struct.Field>
>(fields: Fields) {
  return fields
}

const storageObjectDataFields = makeStorageObjectDataFields({
  kind: Schema.Literal('storage#object'),
  id: Schema.String,
  selfLink: Schema.String,
  name: Schema.String,
  bucket: Schema.String,
  generation: Schema.NumberFromString,
  metageneration: Schema.NumberFromString,
  contentType: Schema.String,
  timeCreated: Schema.DateFromString,
  updated: Schema.DateFromString,
  storageClass: Schema.String,
  timeStorageClassUpdated: Schema.DateFromString,
  size: Schema.NumberFromString,
  mediaLink: Schema.String,
  crc32c: Schema.String,
  etag: Schema.String,
  cacheControl: Schema.String,
  componentCount: Schema.String,
  contentDisposition: Schema.String,
  contentEncoding: Schema.String,
  contentLanguage: Schema.String,
  customerEncryption: Schema.Struct({
    encryptionAlgorithm: Schema.String,
    keySha256: Schema.String,
  }),
  eventBasedHold: Schema.Boolean,
  kmsKeyName: Schema.String,
  md5Hash: Schema.String,
  metadata: Schema.Record({ key: Schema.String, value: Schema.String }),
  retentionExpirationTime: Schema.DateFromString,
  temporaryHold: Schema.Boolean,
  timeDeleted: Schema.DateFromString,
})

export const StorageObjectDataSchema = Schema.extend(
  Schema.partial(Schema.Struct(storageObjectDataFields).omit('kind', 'id'))
)(Schema.Struct(storageObjectDataFields).pick('kind', 'id'))

/**
 * Type representing a Google Cloud Storage notification.
 * Example GCSNotification object:
 * ```
 * {
 *  kind: 'storage#object',
 *  id: 'core-staging-bucket/v1/type=fact_checks/date=2026-06-30/batch-1.batch.ndjson/1782820956151757',
 *  selfLink:
 *    'https://www.googleapis.com/storage/v1/b/core-staging-bucket/o/v1%2Ftype=fact_checks%2Fdate=2026-06-30%2Fbatch-1.batch.ndjson',
 *  name: 'v1/type=fact_checks/date=2026-06-30/batch-1.batch.ndjson',
 *  bucket: 'core-staging-bucket',
 *  generation: '1782820956151757',
 *  metageneration: '1',
 *  contentType: 'application/x-ndjson',
 *  timeCreated: '2026-06-30T12:02:36.157Z',
 *  updated: '2026-06-30T12:02:36.157Z',
 *  storageClass: 'STANDARD',
 *  timeStorageClassUpdated: '2026-06-30T12:02:36.157Z',
 *  size: '288980',
 *  md5Hash: 'ewT3AG46iDbd7KiBE2pAiA==',
 *  mediaLink:
 *    'https://storage.googleapis.com/download/storage/v1/b/core-staging-bucket/o/v1%2Ftype=fact_checks%2Fdate=2026-06-30%2Fbatch-1.batch.ndjson?generation=1782820956151757&alt=media',
 *  crc32c: 'zLZ51g==',
 *  etag: 'CM2/qM71rpUDEAE=',
 * }
 * ```
 */
export type StorageObjectData = Unnest<
  Schema.Schema.Type<typeof StorageObjectDataSchema>
>

export const StorageObjectAttributesSchema = Schema.Struct({
  bucketId: Schema.String,
  eventTime: Schema.DateFromString,
  eventType: Schema.String,
  notificationConfig: Schema.String,
  objectGeneration: Schema.String,
  objectId: Schema.String,
  payloadFormat: Schema.String,
})

export type StorageObjectAttributes = Schema.Schema.Type<
  typeof StorageObjectAttributesSchema
>
