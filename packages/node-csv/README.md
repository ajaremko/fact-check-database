# @news-research/node-csv

An Effect Schema combinator for parsing and serializing CSV.

## Examples

### Decoding a CSV string

```typescript
import { pipe, Schema } from 'effect'
import { NodeCsv } from '@news-research/node-csv'

const MySchema = Schema.Struct({ name: Schema.String, count: Schema.NumberFromString })

const decode = pipe(
  MySchema,
  NodeCsv.parseCsv({ parse: { columns: true, skip_empty_lines: true }, stringify: {} }),
  Schema.decode
)

const result = decode('name,count\nexample,42\n')
// → [{ name: 'example', count: 42 }]
```

### Encoding to a CSV string

```typescript
import { pipe, Schema } from 'effect'
import { NodeCsv } from '@news-research/node-csv'

const MySchema = Schema.Struct({ name: Schema.String, count: Schema.NumberFromString })

const encode = pipe(
  MySchema,
  NodeCsv.parseCsv({ parse: { columns: true }, stringify: { header: true } }),
  Schema.encode
)

const result = encode([{ name: 'example', count: 42 }])
// → "name,count\nexample,42\n"
```
