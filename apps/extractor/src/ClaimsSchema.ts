import { Context, Schema } from 'effect'

export const FieldSchema = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
  mode: Schema.String,
})

export type Field = Schema.Schema.Type<typeof FieldSchema>

export class ClaimsSchema extends Context.Tag('ClaimsSchema')<
  ClaimsSchema,
  {
    fields: readonly Field[]
  }
>() {}
