import { ParseResult, Schema } from 'effect'
import { format, parse } from 'date-fns'

/**
 * Schema that transforms between a date string in a fixed `date-fns` format
 * and the corresponding Unix time in milliseconds.
 *
 * Used to make date components of object paths (for example the
 * `date=yyyy-MM-dd` segment in {@link StagingPathSchema}) both human-readable
 * in storage and numeric in code, with one schema doing the conversion in
 * both directions.
 *
 * - `decode` parses the string with `formatStr`, interpreting it in the local
 *   time zone, and returns `getTime()`.
 * - `encode` formats the number as a `Date` with `formatStr`, failing if the
 *   number is not a valid date.
 *
 * @param formatStr a `date-fns` format string such as `'yyyy-MM-dd'`
 *
 * @example
 * Schema.decodeSync(NumberFromFormattedDate('yyyy-MM-dd'))('2024-01-01')
 * // → 1704067200000
 *
 * Schema.encodeSync(NumberFromFormattedDate('yyyy-MM-dd'))(1704067200000)
 * // → "2024-01-01"
 */
export function NumberFromFormattedDate(formatStr: string) {
  return Schema.transformOrFail(Schema.String, Schema.Number, {
    strict: true,
    encode: (input, _, ast) => {
      const date = new Date(input)
      if (isNaN(date.getTime())) {
        return ParseResult.fail(
          new ParseResult.Type(ast, input, 'Number not a valid date')
        )
      }
      const formatted = format(date, formatStr)
      return ParseResult.succeed(formatted)
    },
    decode: (input, _, ast) => {
      try {
        const parsed = parse(input, formatStr, new Date())
        const output = parsed.getTime()
        return ParseResult.succeed(output)
      } catch {
        return ParseResult.fail(
          new ParseResult.Type(
            ast,
            input,
            `String does not match format ${formatStr}`
          )
        )
      }
    },
  })
}
