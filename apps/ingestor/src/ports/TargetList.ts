import { Context } from 'effect'

import type { SourceTarget } from '../domain/SourceTarget'

export class TargetList extends Context.Tag('TargetList')<
  TargetList,
  {
    readonly targets: SourceTarget[]
  }
>() {}
