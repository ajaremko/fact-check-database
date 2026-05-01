import { Brand, Schema } from 'effect'

export const TimestampSchema = Schema.NonNegative.pipe(
  Schema.brand('Timestamp')
)

export type Timestamp = Schema.Schema.Type<typeof TimestampSchema>

export const TimestampBrand = Brand.nominal<Timestamp>()
