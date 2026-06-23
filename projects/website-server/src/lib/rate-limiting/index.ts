import Redis from 'ioredis'
import { RateLimiterRedis } from 'rate-limiter-flexible'

type Env = { redis: Redis; rl: RateLimiterRedis }

let env = null as Env | null

function accessEnv(): Env {
  if (env) return env

  const client = new Redis({
    enableOfflineQueue: true,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  })
  // It is recommended to process Redis errors and setup some reconnection strategy
  client.on('error', console.error)

  const opts = {
    // Basic options
    storeClient: client,
    points: 1, // Number of points
    duration: Number(process.env.MAX_REQUESTS_PER_SEC), // Per second(s)
    keyPrefix: 'rlflx', // must be unique for limiters with different purpose
  }

  const rateLimiterRedis = new RateLimiterRedis(opts)

  env = { redis: client, rl: rateLimiterRedis }

  return env
}

type ConsumeResult =
  | {
      type: 'success'
    }
  | {
      type: 'quota_exceeded'
      retryAfter: number
    }
  | {
      type: 'error'
      message: string
    }

export function consume(id: string): Promise<ConsumeResult> {
  const env = accessEnv()
  return env.rl
    .consume(id)
    .then((_): ConsumeResult => {
      return { type: 'success' } as const
    })
    .catch((error): ConsumeResult => {
      // Never happen if `insuranceLimiter` set up
      if (error instanceof Error) {
        console.error('Redis error', error)
        return {
          type: 'error',
          message: error.message,
        } as const
      } else {
        // Can't consume
        // If there is no error, rateLimiterRedis promise rejected with number of ms before next request allowed
        const secs = Math.round(error.msBeforeNext / 1000) || 1
        return {
          type: 'quota_exceeded',
          retryAfter: secs,
        } as const
      }
    })
}
