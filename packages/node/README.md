# @news-research/node

Effect-based utilities and schema combinators for Node.js.

## Examples

### parseBuffer

Schema combinator that transforms between a Node.js `Buffer` and a string. A `parseUint8Array` version is also provided.

```typescript
import { pipe, Schema } from 'effect'
import { Node } from '@news-research/node'

const MySchema = Schema.Struct({ name: Schema.String })

const decode = pipe(
  MySchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const result = decode(Buffer.from('{"name":"example"}'))
// → { name: 'example' }
```

### sha256Hex

Computes the SHA-256 hex digest of a string or `Uint8Array`.

```typescript
import { Effect } from 'effect'
import { Node } from '@news-research/node'

const hash = Node.sha256Hex('hello', 'utf8')
// → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"

const hash = Node.sha256Hex(responseBody) // Uint8Array
```

### generateUUID

Generates a random UUID (v4).

```typescript
import { Node } from '@news-research/node'

const id = Node.generateUUID()
// → "a3bb189e-8bf9-3888-9912-ace4e6543002"
```
