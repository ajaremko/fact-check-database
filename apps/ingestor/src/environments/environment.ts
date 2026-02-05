import { Effect } from 'effect'
import { HttpClient, FileSystem, FetchHttpClient } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'

type Target = {
  id: string
  name: string
  url: string
}

const loadTargetConfig = FileSystem.FileSystem.pipe(
  Effect.andThen((fs) => fs.readFile('apps/ingestor/targets.csv')),
  Effect.map((data) => data.toString()),
  Effect.map((csv) =>
    csv
      .split('\n')
      .slice(1)
      .map((line): Target => {
        const [id, name, url] = line.split(',')
        return { id, name, url }
      })
  )
)

function fetchTargetData(target: Target) {
  return HttpClient.get(target.url).pipe(
    Effect.andThen((response) => response.text)
  )
}

function writeResultToFile(target: Target, data: string) {
  return FileSystem.FileSystem.pipe(
    Effect.tap((fs) =>
      fs.makeDirectory('tmp/apps/ingestor', { recursive: true })
    ),
    Effect.andThen((fs) =>
      fs.writeFile(
        `tmp/apps/ingestor/${target.id}_${target.name}.txt`,
        Buffer.from(data)
      )
    )
  )
}

const app = Effect.gen(function* () {
  const targets = yield* loadTargetConfig
  for (const target of targets) {
    const data = yield* fetchTargetData(target)
    yield* writeResultToFile(target, data)
  }
})

export const main = app.pipe(
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(FetchHttpClient.layer)
)
