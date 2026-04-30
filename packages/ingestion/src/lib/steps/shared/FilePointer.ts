import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object.
 *
 * When `generation` is present, reads are pinned to an immutable object
 * version and will not reflect subsequent overwrites.
 */
export const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
})

export type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>
