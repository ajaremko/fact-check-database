import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { Storage } from '@google-cloud/storage'

import { SourceTargetSchema } from '../../domain/SourceTarget'
import { TargetList, TargetListError } from '../../ports/TargetList'
import { parseBuffer, parseCsv } from '../../utils/schema'

// SourceTarget[] -> Csv -> Buffer
const decodeSources = pipe(
  SourceTargetSchema,
  parseCsv({
    parse: {
      columns: true,
      skip_empty_lines: true,
    },
    stringify: {},
  }),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const bucketName = yield* Config.string('TARGET_LIST_BUCKET_NAME')
  const uri = yield* Config.string('TARGET_LIST_URI')

  const client = new Storage()
  const bucket = client.bucket(bucketName)
  const file = bucket.file(uri)

  return TargetList.of({
    read: Effect.gen(function* () {
      const [buf] = yield* Effect.tryPromise({
        try: () => file.download(),
        catch: (raw) => new TargetListError({ raw }),
      })
      const targets = yield* decodeSources(buf).pipe(
        Effect.mapError((raw) => new TargetListError({ raw }))
      )
      return targets
    }),
  })
})

export const layer = Layer.effect(TargetList, make)
