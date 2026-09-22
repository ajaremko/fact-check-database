import { pipe, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Xml from '@fact-check-database/core-data/Xml'

// Shared by RssExtractor and AtomExtractor: both feed formats are decoded
// from raw bytes with the same fast-xml-parser options and the same
// bytes -> string -> parsed-XML pipeline, only the target schema differs.
export function decodeFeedXml<A, I extends Record<string, unknown>, R>(
  schema: Schema.Schema<A, I, R>
) {
  return pipe(
    schema,
    Xml.parseXml({
      parser: {
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseTagValue: true,
        trimValues: true,
      },
    }),
    Node.parseUint8Array({ encoding: 'utf-8' }),
    Schema.decode
  )
}
