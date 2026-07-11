import { Effect, Schema } from 'effect'
import { HttpServerRequest } from '@effect/platform'

import * as Node from '@news-research/core-data/Node'
import * as Yaml from '@news-research/core-data/Yaml'
import {
  PubsubMessageEnvelope,
  StorageObjectAttributesSchema,
} from '@news-research/core-contracts/gcp/v1'
import { FormSubmissionSchema } from '@news-research/website-contracts/form-submissions/v1'
import { readFile } from '@news-research/core-io'

const decodePubsubMessageEnvelope = Schema.decodeUnknown(PubsubMessageEnvelope)

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

const decodeFormSubmission = FormSubmissionSchema.pipe(
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const accessFormSubmission = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const body = yield* req.json
  const { message } = yield* decodePubsubMessageEnvelope(body)
  const attributes = yield* decodeAttributes(message.attributes)

  const data = yield* readFile({
    object: attributes.objectId,
    bucket: attributes.bucketId,
  })

  return yield* decodeFormSubmission(data)
})
