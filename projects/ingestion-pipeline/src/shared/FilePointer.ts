import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object in GCS.
 */
export const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
})

export type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>
