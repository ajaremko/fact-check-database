import { flow, Schema } from 'effect'

import * as Node from './Node'

function split(separator: string) {
  return function <A, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transform(Schema.String, Schema.Array(schema), {
      strict: true,
      decode: (i) => i.split(separator),
      encode: (a) => a.join(separator),
    })
  }
}

export function parseNdjson(options?: Schema.ParseJsonOptions) {
  return flow(Node.parseJson(options), split('\n'))
}
