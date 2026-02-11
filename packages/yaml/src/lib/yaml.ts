import { ParseResult, Schema } from 'effect'
import * as Yaml from 'yaml'

type ParseYamlOptions = Yaml.ParseOptions &
  Yaml.DocumentOptions &
  Yaml.SchemaOptions &
  Yaml.ToJSOptions

/**
 * The parseYaml combinator provides a method to create a schema that can parse
 * objects from YAML strings and encode objects into YAML strings.
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
