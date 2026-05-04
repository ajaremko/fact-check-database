import { NodeRuntime } from '@effect/platform-node'

import { main } from './environments/environment'

// const enablePrettyLogger = process.env.ENABLE_PRETTY_LOGGER === 'true'

NodeRuntime.runMain(main)
