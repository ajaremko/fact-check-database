import { Effect, Schema } from 'effect'
import {
  Encoding,
  RandomUUIDOptions,
  createHash,
  randomUUID,
} from 'node:crypto'

/**
 * Wrapper around Schema.parseJson with more egonomic paramater passing
 */
export function parseJson(options?: Schema.ParseJsonOptions) {
  return function <A, I, R>(schema: Schema.Schema<A, I, R>) {
    return Schema.parseJson(schema, options)
  }
}

/**
 * The parseBuffer combinator provides a method to convert buffers into the string type using the node buffer implementation.
 */
export function parseBuffer(opts: { encoding: BufferEncoding }) {
  return function <A, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transform(
      // Source type: Buffer
      Schema.instanceOf(Buffer),
      // Target type: A
      schema,
      {
        strict: true,
        decode: (buf) => buf.toString(opts.encoding),
        encode: (str) => Buffer.from(str, opts.encoding),
      }
    )
  }
}

/**
 * The parseUint8Array combinator provides a method to convert Uint8Array<ArrayBufferLike> (like those used in
 * `FileSystem` methods in `@effect/platform`) into the string type using the node buffer implementation.
 */
export function parseUint8Array(opts: { encoding: BufferEncoding }) {
  return function <A, R>(
    schema: Schema.Schema<A, string, R>
  ): Schema.transform<
    Schema.instanceOf<Uint8Array<ArrayBufferLike>>,
    Schema.Schema<A, string, R>
  > {
    return Schema.transform(
      // Source type: Buffer
      Schema.instanceOf(Uint8Array) as Schema.instanceOf<
        Uint8Array<ArrayBufferLike>
      >,
      // Target type: A
      schema,
      {
        strict: true,
        decode: (buf) => Buffer.from(buf).toString(opts.encoding),
        encode: (str) => Buffer.from(str, opts.encoding),
      }
    )
  }
}

export function sha256Hex(bytes: Uint8Array): Effect.Effect<string>
export function sha256Hex(
  str: string,
  encoding: Encoding
): Effect.Effect<string>
export function sha256Hex(input: Uint8Array | string, encoding?: Encoding) {
  if (typeof input === 'string' && encoding) {
    return Effect.sync(() =>
      createHash('sha256').update(input, encoding).digest('hex')
    )
  }
  return Effect.sync(() => createHash('sha256').update(input).digest('hex'))
}

export function generateUUID(options?: RandomUUIDOptions) {
  return Effect.sync(() => randomUUID(options))
}
