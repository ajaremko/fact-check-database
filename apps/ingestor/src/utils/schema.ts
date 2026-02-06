import { ParseResult, Schema } from 'effect'
import * as CsvParse from 'csv-parse/sync'
import * as CsvStringify from 'csv-stringify/sync'

/**
 * Wrapper around Schema.parseJson with more egonomic paramater passing
 */
export function parseJson(options?: Schema.ParseJsonOptions) {
  return function <A, I, R>(schema: Schema.Schema<A, I, R>) {
    return Schema.parseJson(schema, options)
  }
}

/**
 * The parseBuffer combinator provides a method to convert buffers into the string type using the node buffer implementation.
 */
export function parseBuffer(opts: { encoding: BufferEncoding }) {
  return function <A, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transform(
      // Source type: Buffer
      Schema.instanceOf(Buffer),
      // Target type: A
      schema,
      {
        strict: true,
        decode: (buf) => buf.toString(opts.encoding),
        encode: (str) => Buffer.from(str, opts.encoding),
      }
    )
  }
}

/**
 * The parseUint8Array combinator provides a method to convert Uint8Array<ArrayBufferLike> (like those used in
 * `FileSystem` methods in `@effect/platform`) into the string type using the node buffer implementation.
 */
export function parseUint8Array(opts: { encoding: BufferEncoding }) {
  return function <A, R>(
    schema: Schema.Schema<A, string, R>
  ): Schema.transform<
    Schema.instanceOf<Uint8Array<ArrayBufferLike>>,
    Schema.Schema<A, string, R>
  > {
    return Schema.transform(
      // Source type: Buffer
      Schema.instanceOf(Uint8Array) as Schema.instanceOf<
        Uint8Array<ArrayBufferLike>
      >,
      // Target type: A
      schema,
      {
        strict: true,
        decode: (buf) => Buffer.from(buf).toString(opts.encoding),
        encode: (str) => Buffer.from(str, opts.encoding),
      }
    )
  }
}

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
