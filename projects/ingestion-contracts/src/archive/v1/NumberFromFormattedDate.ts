import { ParseResult, Schema } from 'effect'
import { format, parse } from 'date-fns'

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
      // `parse` returns an Invalid Date rather than throwing when the input
      // does not match the format, so the result is checked explicitly. It
      // does throw on an unsupported format string, hence the catch.
      const fail = () =>
        ParseResult.fail(
          new ParseResult.Type(
            ast,
            input,
            `String does not match format ${formatStr}`
          )
        )
      try {
        const output = parse(input, formatStr, new Date()).getTime()
        return isNaN(output) ? fail() : ParseResult.succeed(output)
      } catch {
        return fail()
      }
    },
  })
}
