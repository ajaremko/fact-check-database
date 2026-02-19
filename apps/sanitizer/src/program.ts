import { Clock, Effect, Queue } from 'effect'

import { Archiver } from './ports/Archiver'
import { MessageQueue } from './ports/MessageQueue'
import { SanitizerPolicyDocument } from './ports/SanitizerPolicyDocument'

import { evaluatePolicy } from './integration'
import { Node } from '@news-research/node'

export const Program = Effect.gen(function* () {
  const policyDocument = yield* SanitizerPolicyDocument
  const archiver = yield* Archiver
  const { messages, errors } = yield* MessageQueue

  const policy = yield* policyDocument.read

  const handleMessages = Queue.take(messages).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const event = yield* message.read
        const record = yield* archiver.readFetchAttemptRecord(event.pointer)
        if (record.outcome === 'data_fetched') {
          yield* Effect.logInfo(
            `Fetched data for ${record.url} with content-type ${record.http.contentType}`
          )
          const decision = yield* evaluatePolicy(policy, record)
          yield* Effect.logInfo(
            `Policy decision for ${record.url}: label=${
              decision.label
            }, actions=${decision.actions.join(',')}, rewriteBody=${
              decision.rewriteBody
            }`
          )
          const sanitizationId = yield* Node.generateUUID()
          const sanitizedAt = yield* Clock.currentTimeMillis
          const pointer = yield* archiver.writeSanitizerRecord(
            sanitizationId,
            {
              version: 1,
              kind: 'sanitized_record',
              url: record.url,
              http: record.http,
              runId: record.runId,
              source: record.source,
              content: record.content,
              sanitizationId,
              sanitizedAt,
              policy: {
                label: decision.label,
                actions: decision.actions,
              },
              input: {
                record: event.pointer,
                raw:
                  record.outcome === 'data_fetched' ? event.pointer : undefined,
              },
            },
            {
              sourceCollection: record.source.collection,
              sourceName: record.source.name,
              sanitizedAt,
              url: record.url,
              id: sanitizationId,
            }
          )
          yield* Effect.logInfo(
            `Wrote sanitizer record for ${record.url} to pointer ${pointer}`
          )
        } else {
          yield* Effect.logInfo(
            `Fetch attempt for ${record.url} failed with error: ${record.error}`
          )
        }
      }).pipe(
        Effect.tapError(Effect.logError),
        Effect.catchTag('ParseError', () => message.ack),
        Effect.catchAll(() => message.nack)
      )
    ),
    Effect.forever
  )

  const handleErrors = Queue.take(errors).pipe(
    Effect.tap((error) =>
      Effect.logError(`Message queue error: ${error.cause}`)
    ),
    Effect.andThen(Effect.fail)
  )

  yield* Effect.logInfo('Starting sanitizer...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
