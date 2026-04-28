import { ParseResult, Schema } from 'effect'

export const NumberFromDate = Schema.transformOrFail(
  Schema.instanceOf(Date),
  Schema.Number,
  {
    strict: true,
    encode: (input, _, ast) => {
      const date = new Date(input)
      if (isNaN(date.getTime())) {
        return ParseResult.fail(
          new ParseResult.Type(ast, input, 'Invalid number')
        )
      }
      return ParseResult.succeed(date)
    },
    decode: (input, _, ast) => {
      const timestamp = input.getTime()
      if (isNaN(timestamp)) {
        return ParseResult.fail(
          new ParseResult.Type(ast, input, 'Invalid date')
        )
      }
      return ParseResult.succeed(timestamp)
    },
  }
)
