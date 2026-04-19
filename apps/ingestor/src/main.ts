import { NodeRuntime } from '@effect/platform-node'

import { main } from './environments/environment'

NodeRuntime.runMain(main, { disablePrettyLogger: true })
