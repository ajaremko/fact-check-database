import { Effect, Schema } from 'effect'
import {
  Encoding,
  RandomUUIDOptions,
  createHash,
  randomUUID,
} from 'node:crypto'

/**
 * A tiny wrapper around `Schema.parseJson` with more ergonomic parameter passing.
 *
 * @example
 * const MySchema = Schema.Struct({ name: Schema.String })
 * const decode = pipe(MySchema, Node.parseJson(), Schema.decode)
 * const result = decode('{"name":"example"}')
 * // → { name: 'example' }
 */
export function parseJson(options?: Schema.ParseJsonOptions) {
  return function <A, I, R>(schema: Schema.Schema<A, I, R>) {
    return Schema.parseJson(schema, options)
  }
}

/**
 * A schema combinator that transforms between a Node.js `Buffer` and a string.
 *
 * @example
 * const decode = pipe(
 *   Schema.String,
 *   Node.parseBuffer({ encoding: 'utf-8' }),
 *   Schema.decode
 * )
 * const result = decode(Buffer.from('example'))
 * // → "example"
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
 * A schema combinator that transforms between a `Uint8Array` and a string.
 *
 * Equivalent to `parseBuffer` but for `Uint8Array`, which is the type returned
 * by `FileSystem` methods in `@effect/platform`.
 *
 * @example
 * const decode = pipe(
 *   Schema.String,
 *   Node.parseUint8Array({ encoding: 'utf-8' }),
 *   Schema.decode
 * )
 * const result = decode(new TextEncoder().encode('example'))
 * // → "example"
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

/**
 * A schema combinator that transforms between a buffer encoded string and a
 * decoded string.
 *
 * Useful for handling cases where data is transmitted as a base64-encoded string
 * (e.g. Pub/Sub messages) but you want to work with it as a `Buffer` in your
 * application logic.
 *
 * @example
 * const decode = pipe(
 *   Schema.String,
 *   Node.parseBufferEncoded({ encode: 'utf-8', decode: 'base64' }),
 *   Schema.decode
 * )
 * const result = decode('ZXhhbXBsZQ==')
 * // → "example"
 */
export function parseBufferEncoded(opts: {
  encode: BufferEncoding
  decode: BufferEncoding
}) {
  return function <A, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transform(
      // Source type: Buffer
      Schema.String,
      // Target type: A
      schema,
      {
        strict: true,
        decode: (input) =>
          Buffer.from(input, opts.encode).toString(opts.decode),
        encode: (input) => Buffer.from(input).toString(opts.encode),
      }
    )
  }
}

/**
 * Returns an Effect that computes the SHA-256 hex digest of a string or `Uint8Array`.
 *
 * @example
 * // From a string
 * const hash = yield* Node.sha256Hex('hello', 'utf8')
 * // → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 *
 * @example
 * // From a Uint8Array
 * const hash = yield* Node.sha256Hex(responseBody)
 */
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

export type GenerateUUIDOptions = RandomUUIDOptions

/**
 * Returns an Effect that generates a random UUID (v4).
 *
 * @example
 * const id = yield* Node.generateUUID()
 * // → "a3bb189e-8bf9-3888-9912-ace4e6543002"
 */
export function generateUUID(options?: GenerateUUIDOptions) {
  return Effect.sync(() => randomUUID(options))
}
