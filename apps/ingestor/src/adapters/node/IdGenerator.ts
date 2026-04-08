import { Layer, flow } from 'effect'

import { IdGenerator } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/node'

export function make(options?: Node.GenerateUUIDOptions) {
  return IdGenerator.of({
    generate: Node.generateUUID(options),
  })
}

export const layer = flow(make, Layer.succeed(IdGenerator))
