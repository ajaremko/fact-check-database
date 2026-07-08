import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object in storage (bucket + object
 * key). Returned by {@link StorageWriter} and consumed by
 * {@link StorageReader}.
 */
export const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
})

/** A reference to a specific object in storage. See {@link FilePointerSchema}. */
export type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>
