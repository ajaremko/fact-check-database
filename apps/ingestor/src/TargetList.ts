import { Context } from 'effect'

import type { SourceTarget } from '../../../packages/ingestion/dist/lib/steps/ingest'

export class TargetList extends Context.Tag('TargetList')<
  TargetList,
  {
    sources: readonly SourceTarget[]
  }
>() {}
