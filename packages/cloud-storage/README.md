# @news-research/cloud-storage

An Effect-based wrapper around the `@google-cloud/storage` SDK.

## Exported Services

Two services are provided:

- **`StorageClient`** — shared GCP client; required by `StorageBucket`
- **`StorageBucket`** — scoped accessor for a named bucket; exposes `writeFile()`, `readFileMetadata()`, and `downloadFile()`

All I/O operations return a `StorageBucketIOError` on failure.

## Examples

### Writing a file

Create an effect using `writeFile` that writes data to a named path within the bucket in context.

```typescript
import { Effect, Config } from 'effect'
import { StorageClient, StorageBucket } from '@news-research/cloud-storage'

const data = Buffer.from(JSON.stringify({ foo: 'bar' }))

const program = StorageBucket.writeFile('path/to/file.json', data)

program.pipe(
  Effect.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME'))),
  Effect.provide(StorageClient.layer())
)
```

### Downloading a file

`downloadFile` returns a `Buffer[]` of the file contents. Concatenate the chunks to reconstruct the full payload.

```typescript
import { Effect, Config } from 'effect'
import { StorageClient, StorageBucket } from '@news-research/cloud-storage'

const program = Effect.gen(function* () {
  const chunks = yield* StorageBucket.downloadFile('path/to/file.json')
  const contents = Buffer.concat(chunks).toString('utf-8')
  yield* Effect.log(contents)
})

program.pipe(
  Effect.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME'))),
  Effect.provide(StorageClient.layer())
)
```
