import { Effect, Schema } from 'effect'
import { HttpServerRequest } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import {
  PubsubMessageEnvelope,
  StorageObjectAttributesSchema,
} from '@fact-check-database/core-contracts/gcp/v1'
import { FormSubmissionSchema } from '@fact-check-database/website-contracts/form-submissions/v1'
import { readFile } from '@fact-check-database/core-io'

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
