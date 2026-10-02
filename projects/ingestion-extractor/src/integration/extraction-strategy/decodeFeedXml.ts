import { pipe, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import * as Xml from '@fact-check-database/core-data/Xml'

// Shared by RssExtractor and AtomExtractor: both feed formats are decoded
// from raw bytes with the same fast-xml-parser options and the same
// bytes -> string -> parsed-XML pipeline, only the target schema differs.
//
// `parseTagValue` is off, so element text always stays a string. Every
// field the feed schemas read is text, and parsing numeric-looking text
// turned values like a WordPress tag "000" into the number 0. That failed
// the string schema and with it the whole document, and it also rewrote
// values such as a guid "0123" to 123.
export function decodeFeedXml<A, I extends Record<string, unknown>, R>(
  schema: Schema.Schema<A, I, R>
) {
  return pipe(
    schema,
    Xml.parseXml({
      parser: {
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseTagValue: false,
        trimValues: true,
      },
    }),
    Node.parseUint8Array({ encoding: 'utf-8' }),
    Schema.decode
  )
}
