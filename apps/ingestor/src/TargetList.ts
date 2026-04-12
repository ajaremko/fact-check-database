import { Context } from 'effect'

import type { SourceTarget } from '@news-research/ingestion/ingest'

export class TargetList extends Context.Tag('TargetList')<
  TargetList,
  {
    sources: readonly SourceTarget[]
  }
>() {}
