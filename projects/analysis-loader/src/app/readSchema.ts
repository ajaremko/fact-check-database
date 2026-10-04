import { Cache, Context, Data, Duration, Effect, Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import { FilePointer, readFile } from '@fact-check-database/core-io'

const decodeSchema = Schema.Object.pipe(
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

/**
 * Reads and decodes a BigQuery table schema from storage. Called through the
 * cache below, so this body runs, and logs, only when a schema is actually
 * fetched: once per schema object per instance, plus once for each retry
 * after a failed read.
 */
function fetchSchema(pointer: FilePointer) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      'schema.bucket': pointer.bucket,
      'schema.object': pointer.object,
    })
    const schema = yield* readFile(pointer).pipe(Effect.andThen(decodeSchema))
    yield* Effect.logInfo('Batch schema read')
    return schema
  }).pipe(Effect.scoped, Effect.withSpan('readSchema'))
}

/** How many distinct schema objects one instance keeps. In practice there is one per table. */
const SCHEMA_CACHE_CAPACITY = 16

const makeSchemaReader = Effect.gen(function* () {
  const cache = yield* Cache.make({
    capacity: SCHEMA_CACHE_CAPACITY,
    timeToLive: Duration.infinity,
    lookup: fetchSchema,
  })
  return {
    read: (pointer: FilePointer) => {
      // The cache compares keys with `Equal`, which is by reference for plain
      // objects. `Data.struct` makes pointers with the same fields equal, so
      // a schema is fetched once rather than on every request.
      const key = Data.struct(pointer)
      // A schema that was read is kept for the life of the instance. A failed
      // read is dropped from the cache, so the next request tries again:
      // otherwise one failure (e.g. the schema file briefly missing) would
      // fail every later request on this instance, even after the file is
      // back.
      return cache
        .get(key)
        .pipe(Effect.tapErrorCause(() => cache.invalidate(key)))
    },
  }
})

type SchemaReader = Effect.Effect.Success<typeof makeSchemaReader>

const SchemaReader = Context.GenericTag<SchemaReader>('SchemaReader')

export const provideSchemaReader = Effect.provideServiceEffect(
  SchemaReader,
  makeSchemaReader
)

export const { read: readSchema } = Effect.serviceFunctions(SchemaReader)
