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

/**
 * The Cloud Storage object resource that a bucket notification carries as its
 * message body when the notification is configured with
 * `payloadFormat: JSON_API_V1`.
 *
 * The field set mirrors `StorageObjectData` from `@google/events`, and the
 * `makeStorageObjectDataFields` helper above enforces at compile time that
 * every field of that type is covered. Numeric and timestamp fields arrive as
 * strings and are decoded to `number` and `Date`.
 *
 * Only `kind` and `id` are required. Every other field is optional because
 * Cloud Storage omits fields that do not apply to a given object (for example
 * `kmsKeyName` on an object without CMEK, or `timeDeleted` on a live object),
 * and because the development adapters fabricate minimal notifications with
 * only `kind`, `id`, `name`, and `bucket`.
 *
 * Production services rarely decode the full body: the message attributes
 * ({@link StorageObjectAttributesSchema}) already carry the bucket and object
 * name, which is all a loader needs to fetch the object. The full body is
 * decoded when metadata such as `size`, `md5Hash`, or `contentType` is needed.
 *
 * @example
 * // A representative object-finalized body for a staged extraction batch
 * {
 *   kind: 'storage#object',
 *   id: 'core-staging-bucket/v1/type=fact_checks/date=2026-06-30/batch-1.batch.ndjson/1782820956151757',
 *   selfLink: 'https://www.googleapis.com/storage/v1/b/core-staging-bucket/o/v1%2Ftype=fact_checks%2Fdate=2026-06-30%2Fbatch-1.batch.ndjson',
 *   name: 'v1/type=fact_checks/date=2026-06-30/batch-1.batch.ndjson',
 *   bucket: 'core-staging-bucket',
 *   generation: '1782820956151757',
 *   metageneration: '1',
 *   contentType: 'application/x-ndjson',
 *   timeCreated: '2026-06-30T12:02:36.157Z',
 *   updated: '2026-06-30T12:02:36.157Z',
 *   storageClass: 'STANDARD',
 *   timeStorageClassUpdated: '2026-06-30T12:02:36.157Z',
 *   size: '288980',
 *   md5Hash: 'ewT3AG46iDbd7KiBE2pAiA==',
 *   mediaLink: 'https://storage.googleapis.com/download/storage/v1/b/core-staging-bucket/o/v1%2Ftype=fact_checks%2Fdate=2026-06-30%2Fbatch-1.batch.ndjson?generation=1782820956151757&alt=media',
 *   crc32c: 'zLZ51g==',
 *   etag: 'CM2/qM71rpUDEAE=',
 * }
 *
 * @example
 * // Encoding a minimal notification body (as the development storage writer does)
 * const encode = StorageObjectDataSchema.pipe(Node.parseJson(), Schema.encode)
 * yield* encode({ kind: 'storage#object', id: path, name: path, bucket })
 */
export const StorageObjectDataSchema = Schema.extend(
  Schema.partial(Schema.Struct(storageObjectDataFields).omit('kind', 'id'))
)(Schema.Struct(storageObjectDataFields).pick('kind', 'id'))

/**
 * Decoded form of {@link StorageObjectDataSchema}, with `generation`, `size`
 * and similar fields as `number` and timestamps as `Date`. `Unnest` flattens
 * the readonly wrappers Effect adds to nested structs so the type reads like
 * a plain object.
 */
export type StorageObjectData = Unnest<
  Schema.Schema.Type<typeof StorageObjectDataSchema>
>

/**
 * The Pub/Sub message attributes that Cloud Storage attaches to every bucket
 * notification, regardless of payload format.
 *
 * This is the schema most services actually use to act on a notification:
 * `bucketId` and `objectId` together identify the finalized object, and are
 * enough to build a `FilePointer` for a `core-io` `StorageReader`. `eventType`
 * is `OBJECT_FINALIZE` for the notifications this platform subscribes to.
 *
 * Consumers typically narrow it with `Schema.pick` and, where the
 * notification config adds custom attributes (the analysis loader receives
 * `schemaObjectId` this way), extend it with `Schema.extend`.
 *
 * @example
 * const decodeAttributes = StorageObjectAttributesSchema.pipe(
 *   Schema.pick('bucketId', 'objectId'),
 *   Schema.decodeUnknown
 * )
 * const { bucketId, objectId } = yield* decodeAttributes(message.attributes)
 * const bytes = yield* reader.read({ bucket: bucketId, object: objectId })
 */
export const StorageObjectAttributesSchema = Schema.Struct({
  bucketId: Schema.String,
  eventTime: Schema.DateFromString,
  eventType: Schema.String,
  notificationConfig: Schema.optional(Schema.String),
  objectGeneration: Schema.optional(Schema.String),
  objectId: Schema.String,
  payloadFormat: Schema.String,
})

/** Decoded form of {@link StorageObjectAttributesSchema}, with `eventTime` as a `Date`. */
export type StorageObjectAttributes = Schema.Schema.Type<
  typeof StorageObjectAttributesSchema
>
