import { Context } from 'effect'

import { SourceConfig } from '@news-research/ingestion-contracts/config/v1'

export class SourceList extends Context.Tag('SourceList')<
  SourceList,
  {
    sources: readonly SourceConfig[]
  }
>() {}
