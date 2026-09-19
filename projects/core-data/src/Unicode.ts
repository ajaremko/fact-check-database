import unidecode from 'unidecode'
import { ParseResult, Schema } from 'effect'

/**
 * A schema combinator that adds unicode parsing and serialization to an existing schema.
 *
 * Accepts an optional substitution string for characters `unidecode` can't
 * transliterate, then a schema, and produces a new schema that transforms between a UTF-8 string and
 * a US-ASCII string. 
 * Returned schema applies transformation in both directions.

 *
 * @example
 * // Decode a UTF-8 string into a US-ASCII string
 * const decode = pipe(
 *   Schema.String,
 *   parseUnicode(),
 *   Schema.decode
 * )
 * const result = decode(`aéà)àçé`)
 * // → "aea)ace"
 * @example
 * // Encode a UTF-8 string into a US-ASCII string
 * const encode = pipe(
 *   Schema.String,
 *   parseUnicode(),
 *   Schema.encode
 * )
 * const result = encode(`aéà)àçé`)
 * // → "aea)ace"
 */
export function parseUnicode(sub?: string) {
  return function <A extends string, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transformOrFail(Schema.String, schema, {
      strict: true,
      decode: (input, _, ast) =>
        ParseResult.try({
          try: () => unidecode(input, sub),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
      encode: (input, _, ast) =>
        ParseResult.try({
          try: () => unidecode(input, sub),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
    })
  }
}
