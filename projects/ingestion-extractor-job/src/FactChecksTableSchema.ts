import { Context } from 'effect'

import { BigQueryTableSchema } from '@news-research/ingestion-core/pipeline/extract/contracts/v1'

export class FactChecksTableSchema extends Context.Tag('FactChecksTableSchema')<
  FactChecksTableSchema,
  BigQueryTableSchema
>() {}
