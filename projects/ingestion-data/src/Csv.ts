import { ParseResult, Schema } from 'effect'
import * as CsvParse from 'csv-parse/sync'
import * as CsvStringify from 'csv-stringify/sync'

type OptionsWithColumns<T> = Omit<CsvParse.Options<T>, 'columns'> & {
  columns: Exclude<CsvParse.Options['columns'], undefined | false>
}

/**
 * A schema combinator that adds CSV parsing and serialization to an existing schema.
 *
 * Accepts a required options object and a schema, and produces a new schema that
 * transforms between a CSV `string` and an array of the schema's type `A[]`,
 * using `csv-parse` and `csv-stringify`. Set `opts.parse.columns` to `true` to
 * treat the first row as column names.
 *
 * @example
 * // Decode a CSV string into an array of typed objects
 * const MySchema = Schema.Struct({ name: Schema.String, count: Schema.NumberFromString })
 * const decode = pipe(
 *   MySchema,
 *   NodeCsv.parseCsv({ parse: { columns: true, skip_empty_lines: true }, stringify: {} }),
 *   Schema.decode
 * )
 * const result = decode('name,count\nexample,42\n')
 * // → [{ name: 'example', count: 42 }]
 *
 * @example
 * // Encode an array of typed objects into a CSV string
 * const encode = pipe(
 *   MySchema,
 *   NodeCsv.parseCsv({ parse: { columns: true }, stringify: { header: true } }),
 *   Schema.encode
 * )
 * const result = encode([{ name: 'example', count: 42 }])
 * // → "name,count\nexample,42\n"
 */
export function parseCsv<I>(opts: {
  parse: OptionsWithColumns<I>
  stringify: CsvStringify.Options
}) {
  return function <A, R>(schema: Schema.Schema<A, I, R>) {
    return Schema.transformOrFail(Schema.String, Schema.Array(schema), {
      strict: true,
      decode: (str, _, ast) =>
        ParseResult.try({
          try: () => CsvParse.parse(str, opts.parse),
          catch: (err) => {
            if (err instanceof CsvParse.CsvError) {
              return new ParseResult.Type(ast, str, err.message)
            }
            return new ParseResult.Unexpected(ast, str)
          },
        }),
      encode: (as, _, ast) =>
        ParseResult.try({
          try: () =>
            CsvStringify.stringify(as as CsvStringify.Input, opts.stringify),
          catch: () => {
            return new ParseResult.Unexpected(ast, 'failed to parse csv')
          },
        }),
    })
  }
}
