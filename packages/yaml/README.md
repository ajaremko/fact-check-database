# @news-research/yaml

An Effect Schema combinator for parsing and serializing YAML.

## Examples

### Decoding a YAML string

```typescript
import { pipe, Schema } from 'effect'
import { Yaml } from '@news-research/yaml'

const MySchema = Schema.Struct({ name: Schema.String, count: Schema.Number })

const decode = pipe(MySchema, Yaml.parseYaml(), Schema.decode)

const result = decode(`
  name: example
  count: 42
`)
// → { name: 'example', count: 42 }
```

### Encoding to a YAML string

```typescript
import { pipe, Schema } from 'effect'
import { Yaml } from '@news-research/yaml'

const MySchema = Schema.Struct({ name: Schema.String, count: Schema.Number })

const encode = pipe(MySchema, Yaml.parseYaml(), Schema.encode)

const result = encode({ name: 'example', count: 42 })
// → "name: example\ncount: 42\n"
```
