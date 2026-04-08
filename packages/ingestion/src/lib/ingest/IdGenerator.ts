import { Context, Effect } from 'effect'

export class IdGenerator extends Context.Tag('IdGenerator')<
  IdGenerator,
  {
    readonly generate: Effect.Effect<string>
  }
>() {}
