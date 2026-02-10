import { Schema } from 'effect'

export class NoResponse extends Schema.TaggedClass<NoResponse>('NoResponse')(
  'NoResponse',
  {
    error: Schema.String,
  }
) {}

export class Response extends Schema.TaggedClass<Response>('Response')(
  'Response',
  {
    status: Schema.Number,
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    body: Schema.instanceOf(Uint8Array),
    error: Schema.NullOr(Schema.String),
  }
) {}

export const isResponse = Schema.is(Response)

export type FetchResult = Response | NoResponse
