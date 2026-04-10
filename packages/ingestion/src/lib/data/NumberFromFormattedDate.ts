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
