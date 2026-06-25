import { Schema } from 'effect'

export const GCSNotificationSchema = Schema.Struct({
  kind: Schema.Literal('storage#object'),
  id: Schema.String,
  selfLink: Schema.String,
  mediaLink: Schema.String,
  name: Schema.String,
  bucket: Schema.String,
  generation: Schema.Number,
  metageneration: Schema.Number,
  contentType: Schema.String,
  storageClass: Schema.String,
  size: Schema.Number,
  softDeleteTime: Schema.DateFromString,
  restoreToken: Schema.String,
  hardDeleteTime: Schema.DateFromString,
  md5Hash: Schema.String,
  contentEncoding: Schema.String,
  contentDisposition: Schema.String,
  contentLanguage: Schema.String,
  cacheControl: Schema.String,
  crc32c: Schema.String,
  componentCount: Schema.Int,
  etag: Schema.String,
  kmsKeyName: Schema.String,
  temporaryHold: Schema.Boolean,
  eventBasedHold: Schema.Boolean,
  retentionExpirationTime: Schema.DateFromString,
  retention: Schema.Struct({
    retainUntilTime: Schema.DateFromString,
    mode: Schema.String,
  }),
  timeCreated: Schema.DateFromString,
  timeFinalized: Schema.DateFromString,
  updated: Schema.DateFromString,
  timeDeleted: Schema.DateFromString,
  timeStorageClassUpdated: Schema.DateFromString,
  customTime: Schema.DateFromString,
  metadata: Schema.Record({ key: Schema.String, value: Schema.String }),
  acl: Schema.Array(Schema.Unknown),
  owner: Schema.Struct({
    entity: Schema.String,
    entityId: Schema.String,
  }),
  customerEncryption: Schema.Struct({
    encryptionAlgorithm: Schema.String,
    keySha256: Schema.String,
  }),
  contexts: Schema.Struct({
    custom: Schema.Record({
      key: Schema.String,
      value: Schema.Struct({
        value: Schema.String,
        createTime: Schema.DateFromString,
        updateTime: Schema.DateFromString,
      }),
    }),
  }),
})

export type GCSNotification = Schema.Schema.Type<typeof GCSNotificationSchema>
