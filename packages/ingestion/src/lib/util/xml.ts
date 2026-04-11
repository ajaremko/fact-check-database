import {
  XMLParser,
  XMLBuilder,
  XmlBuilderOptions,
  X2jOptions,
} from 'fast-xml-parser'

import { ParseResult, Schema } from 'effect'

/**
 * A schema combinator that adds XML parsing and serialization to an existing schema.
 *
 * Accepts an optional options object, then a schema,
 * and produces a new schema that transforms between an XML `string` and the
 * schema's type `A`. Supports both directions using `XMLParser` and `XMLBuilder`
 * from the `fast-xml-parser` package.
 *
 * @example
 * // Decode an XML string into a typed object
 * const MySchema = Schema.Struct({
 *   name: Schema.String,
 *   count: Schema.Number
 * })
 * const decode = pipe(
 *   MySchema,
 *   parseXml(),
 *   Schema.decode
 * )
 * const result = decode(`
 *   name: example
 *   count: 42
 * `)
 * // → { name: 'example', count: 42 }
 * @example
 * // Encode a typed object into an XML string
 * const encode = pipe(
 *   MySchema,
 *   parseXml(),
 *   Schema.encode
 * )
 * const result = encode({ name: 'example', count: 42 })
 * // → "<name>example</name><count>42</count>"
 */
export function parseXml<I>(opts?: {
  parser?: X2jOptions
  builder?: XmlBuilderOptions
}) {
  const defaults = {
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
  }
  const parser =
    opts && opts.parser
      ? new XMLParser({
          ...defaults,
          ...opts.parser,
        })
      : new XMLParser(defaults)
  const builder =
    opts && opts.builder ? new XMLBuilder(opts.builder) : new XMLBuilder()

  return function <A, I extends Record<string, unknown>, R>(
    schema: Schema.Schema<A, I, R>
  ) {
    return Schema.transformOrFail(Schema.String, schema, {
      strict: true,
      decode: (input, _, ast) =>
        ParseResult.try({
          try: () => parser.parse(input),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
      encode: (input, _, ast) =>
        ParseResult.try({
          try: () => builder.build(input),
          catch: () => new ParseResult.Unexpected(ast, input.toString()),
        }),
    })
  }
}
