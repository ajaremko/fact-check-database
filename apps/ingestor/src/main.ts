import { Effect } from 'effect'
import { NodeRuntime } from '@effect/platform-node'

NodeRuntime.runMain(Effect.logInfo('Hello from Effect TS on Node.js!'))
