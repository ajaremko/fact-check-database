import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { Storage } from '@google-cloud/storage'

import { Archiver, ArchiverError } from '../../ports/Archive'
import { parseBuffer, parseJson } from '../../utils/schema'

// Object -> JSON -> Buffer
const encodeData = pipe(
  Schema.Object,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const bucketName = yield* Config.string('ARCHIVER_BUCKET_NAME')

  const client = new Storage()
  const bucket = client.bucket(bucketName)

  return Archiver.of({
    archive: (opts) =>
      Effect.gen(function* () {
        const path = `${opts.runId}_${opts.sourceName}.json`
        const data = yield* encodeData(opts).pipe(
          Effect.mapError((cause) => new ArchiverError({ cause }))
        )
        const file = bucket.file(path)
        yield* Effect.tryPromise({
          try: () => file.save(data),
          catch: (cause) => new ArchiverError({ cause }),
        })
        return {
          object: file.name,
          bucket: bucketName,
        }
      }),
  })
})

export const layer = Layer.effect(Archiver, make)
