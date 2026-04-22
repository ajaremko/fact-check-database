import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object.
 *
 * When `generation` is present, reads are pinned to an immutable object
 * version and will not reflect subsequent overwrites.
 */
export class FilePointer extends Schema.TaggedClass<FilePointer>()(
  'FilePointer',
  {
    bucket: Schema.String,
    object: Schema.String,
  }
) {}
