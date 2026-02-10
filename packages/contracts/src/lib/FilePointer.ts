import { Schema } from 'effect'

export const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
  generation: Schema.optional(Schema.Number),
})

export type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>
