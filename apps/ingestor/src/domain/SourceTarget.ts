import { Schema } from 'effect'

export const SourceTargetSchema = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
})

export type SourceTarget = Schema.Schema.Type<typeof SourceTargetSchema>
