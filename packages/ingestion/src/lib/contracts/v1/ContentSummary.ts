import { Schema } from 'effect'

/** Content metrics included in sanitized records. */
export const ContentSummarySchema = Schema.Struct({
  sha256: Schema.String,
  bytes: Schema.Number,
})
