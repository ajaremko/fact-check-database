import { Context, Data, Effect } from 'effect'

import type { SourceTarget } from '../domain/SourceTarget'

export class TargetListError extends Data.TaggedError('TargetListError')<{
  readonly raw: unknown
}> {}

export class TargetList extends Context.Tag('TargetList')<
  TargetList,
  {
    readonly read: Effect.Effect<readonly SourceTarget[], TargetListError>
  }
>() {}
