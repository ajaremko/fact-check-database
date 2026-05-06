import { Context } from 'effect'

import { BigQueryTableSchema } from './BigQueryTableSchema'

export class FactChecksTableSchema extends Context.Tag('FactChecksTableSchema')<
  FactChecksTableSchema,
  BigQueryTableSchema
>() {}
