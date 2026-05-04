import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object.
 *
 * Embedded in events and records to link them to their archived payloads.
 * When `generation` is present, reads are pinned to an immutable object
 * version and will not reflect subsequent overwrites.
 */
export const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
  generation: Schema.optional(Schema.Number),
})

/** A reference to a specific file object */
export type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>
