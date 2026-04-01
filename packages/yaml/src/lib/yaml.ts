import { ParseResult, Schema } from 'effect'
import * as Yaml from 'yaml'

type ParseYamlOptions = Yaml.ParseOptions &
  Yaml.DocumentOptions &
  Yaml.SchemaOptions &
  Yaml.ToJSOptions

/**
 * A schema combinator that adds YAML parsing and serialization to an existing schema.
 *
 * Accepts an optional options object, then a schema,
 * and produces a new schema that transforms between a YAML `string` and the
 * schema's type `A`. Supports both directions using `yaml.parse()` and
 * `yaml.stringify()` from the `yaml` package.
 *
 * @example
 * // Decode a YAML string into a typed object
 * const MySchema = Schema.Struct({
 *   name: Schema.String,
 *   count: Schema.Number
 * })
 * const decode = pipe(
 *   MySchema,
 *   Yaml.parseYaml(),
 *   Schema.decode
 * )
 * const result = decode(`
 *   name: example
 *   count: 42
 * `)
 * // → { name: 'example', count: 42 }
 * @example
 * // Encode a typed object into a YAML string
 * const encode = pipe(
 *   MySchema,
 *   Yaml.parseYaml(),
 *   Schema.encode
 * )
 * const result = encode({ name: 'example', count: 42 })
 * // → "name: example\ncount: 42\n"
 */
export function parseYaml<I>(opts?: ParseYamlOptions) {
  return function <A, R>(schema: Schema.Schema<A, I, R>) {
    return Schema.transformOrFail(Schema.String, schema, {
      strict: true,
      decode: (str, _, ast) =>
        ParseResult.try({
          try: () => Yaml.parse(str, opts),
          catch: (err) => {
            if (err instanceof Yaml.YAMLError) {
              return new ParseResult.Type(ast, str, err.message)
            }
            return new ParseResult.Unexpected(ast, str)
          },
        }),
      encode: (as, _, ast) =>
        ParseResult.try({
          try: () => Yaml.stringify(as, opts),
          catch: () => {
            return new ParseResult.Unexpected(ast, 'failed to parse yaml')
          },
        }),
    })
  }
}
