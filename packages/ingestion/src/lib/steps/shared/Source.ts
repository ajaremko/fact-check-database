import { Schema } from 'effect'

/**
 * Schema for a reference to a specific object.
 *
 * When `generation` is present, reads are pinned to an immutable object
 * version and will not reflect subsequent overwrites.
 */
export const SourceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: Schema.Literal('atom', 'rss'),
})

export type Source = Schema.Schema.Type<typeof SourceSchema>
