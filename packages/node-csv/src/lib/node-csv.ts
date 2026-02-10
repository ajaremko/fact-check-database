import { ParseResult, Schema } from 'effect'
import * as CsvParse from 'csv-parse/sync'
import * as CsvStringify from 'csv-stringify/sync'

type OptionsWithColumns<T> = Omit<CsvParse.Options<T>, 'columns'> & {
  columns: Exclude<CsvParse.Options['columns'], undefined | false>
}

/**
 * The parseCsv combinator provides a method to create a schema that can parse CSV strings into arrays of
 * objects, and encode arrays of objects into CSV strings.
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
