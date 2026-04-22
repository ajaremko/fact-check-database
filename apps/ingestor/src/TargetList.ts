import { Context, Schema } from 'effect'

export const SourceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: Schema.String, // "csv" | "rss" | "gdelt" later
})

export type Source = Schema.Schema.Type<typeof SourceSchema>

export class SourceList extends Context.Tag('SourceList')<
  SourceList,
  {
    sources: readonly Source[]
  }
>() {}
