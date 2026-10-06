import { Effect, Metric, pipe, Schema } from 'effect'

import { omitNullKeys } from '@fact-check-database/core-data'
import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import {
  FilePointer,
  FilePointerSchema,
} from '@fact-check-database/ingestion-contracts/archive/v1'
import {
  Timestamp,
  TimestampEncoded,
  TimestampSchema,
} from '@fact-check-database/ingestion-contracts/shared/v1'
import {
  RecordSanitizedKey,
  RecordSanitizedSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'
import { readFile, writeFile } from '@fact-check-database/core-io'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'

import {
  SanitizedObservation,
  SanitizedObservationMetaSchema,
  SanitizedObservationSchema,
  SanitizedObservationPathSchema,
  SanitizedBodyPathSchema,
} from './SanitizedObservation'
import { ObservationSchema } from './Observation'
import type { SanitizationAction } from './PolicyDecision'
import { evaluatePolicy } from './evaluatePolicy'
import { dropHeaders } from './dropHeaders'
import { stripQueryParams, stripQueryParamsInText } from './stripQueryParams'

const decodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizedObservation = pipe(
  SanitizedObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeSanitizedObservationMeta = Schema.encode(
  SanitizedObservationMetaSchema
)
const encodeSanitizedObservationPath = Schema.encode(
  SanitizedObservationPathSchema
)
const encodeSanitizedBodyPath = Schema.encode(SanitizedBodyPathSchema)

// Latin-1 maps every byte to one character and back. Reading a body this way
// lets it be edited as text without changing any byte the edit doesn't
// touch, whatever encoding the feed is in. The URLs being edited are ASCII.
const BodyTextSchema = pipe(
  Schema.String,
  Node.parseUint8Array({ encoding: 'latin1' })
)
const decodeBodyText = Schema.decode(BodyTextSchema)
const encodeBodyText = Schema.encode(BodyTextSchema)

const decodeArgs = Schema.decode(
  Schema.Struct({
    policy: SanitizerPolicy,
    pointer: FilePointerSchema,
    timestamp: TimestampSchema,
  })
)

const contentRecordsSanitized = Metric.counter('content_records_sanitized')

/**
 * Strips the policy's listed query parameters from every URL in a raw body.
 * When that changes the body, the result is archived as a sanitized copy and
 * described in the return value. Returns `null` when the body had nothing to
 * remove: no copy is written, and the record keeps pointing at the raw body.
 */
const rewriteBody = Effect.fn('rewriteBody')(function* (args: {
  raw: FilePointer
  contentType: string | null
  stripQueryParams: ReadonlyArray<string>
  sourceId: string
  ingestorRunId: string
  fetchedAt: Timestamp
}) {
  const rawBody = yield* readFile(args.raw)
  const rawText = yield* decodeBodyText(rawBody)

  const stripped = stripQueryParamsInText(rawText, args.stripQueryParams)
  if (stripped.urlsChanged === 0) return null

  const body = yield* encodeBodyText(stripped.text)
  const sha256 = yield* Node.sha256Hex(body)
  const path = yield* encodeSanitizedBodyPath({
    contentSha256: sha256,
    sourceId: args.sourceId,
    ingestorRunId: args.ingestorRunId,
    fetchedAt: args.fetchedAt,
  })
  const pointer = yield* writeFile(
    omitNullKeys({
      path,
      data: body,
      contentType: args.contentType,
    })
  )

  return {
    pointer,
    sha256,
    bytes: body.byteLength,
    urlsStripped: stripped.urlsChanged,
  }
})

export const sanitizeObservation = Effect.fn('sanitizeObservation')(
  function* (args: {
    policy: SanitizerPolicy
    pointer: FilePointer
    timestamp: TimestampEncoded
  }) {
    yield* Effect.annotateLogsScoped({
      'input.bucket': args.pointer.bucket,
      'input.object': args.pointer.object,
    })
    const ctx = yield* decodeArgs(args)

    const inputRecordData = yield* readFile(ctx.pointer)
    const observation = yield* decodeObservation(inputRecordData)
    yield* Effect.annotateLogsScoped({
      'source.id': observation.source.id,
      'source.name': observation.source.name,
      'source.url': observation.source.url,
      'source.collection': observation.source.collection,
    })

    const evaluated = evaluatePolicy(ctx.policy, observation)
    const raw = observation.raw

    yield* Metric.increment(contentRecordsSanitized).pipe(
      Effect.tagMetrics({
        decision_label: evaluated.label,
        source_collection: observation.source.collection,
        source_name: observation.source.name,
      })
    )

    // The response metadata is scrubbed on every record that has it,
    // quarantined ones included: the record is archived either way.
    const headers = dropHeaders(raw?.http.headers ?? {}, ctx.policy.dropHeaders)
    const rawFinalUrl = raw?.http.finalUrl ?? null
    const finalUrl =
      rawFinalUrl === null
        ? null
        : stripQueryParams(rawFinalUrl, ctx.policy.stripQueryParams)

    // The body is rewritten only for a record that passed every gate:
    // `evaluatePolicy` reports `rewriteBody` as false for the rest. With no
    // parameters listed there is nothing to strip, so the body isn't read.
    const sanitizedBody =
      raw && evaluated.rewriteBody && ctx.policy.stripQueryParams.length > 0
        ? yield* rewriteBody({
            raw: raw.pointer,
            contentType: raw.http.contentType,
            stripQueryParams: ctx.policy.stripQueryParams,
            sourceId: observation.source.id,
            ingestorRunId: observation.ingestorRunId,
            fetchedAt: observation.fetchedAt,
          })
        : null

    const actions: SanitizationAction[] = [...evaluated.actions]
    if (headers.dropped.length > 0) actions.push('DROPPED_HEADERS')
    if (finalUrl !== rawFinalUrl || sanitizedBody)
      actions.push('QUERY_STRIPPED')
    if (sanitizedBody) actions.push('BODY_REWRITTEN')
    const decision = { ...evaluated, actions }

    yield* Effect.annotateLogsScoped({
      'decision.label': decision.label,
      'decision.actions': decision.actions.join(','),
      'headers.dropped': headers.dropped.length,
      'body.urlsStripped': sanitizedBody ? sanitizedBody.urlsStripped : 0,
    })
    if (sanitizedBody) {
      yield* Effect.annotateLogsScoped({
        'sanitized.object': sanitizedBody.pointer.object,
      })
    }

    const sanitizedObservation = new SanitizedObservation({
      policyVersion: ctx.policy.version,
      ingestorRunId: observation.ingestorRunId,
      fetchedAt: observation.fetchedAt,
      sanitizedAt: ctx.timestamp,
      source: observation.source,
      http: raw ? { ...raw.http, finalUrl, headers: headers.headers } : null,
      // `content` describes the body downstream stages read: the sanitized
      // copy when one was written, the raw body otherwise.
      content: sanitizedBody
        ? { sha256: sanitizedBody.sha256, bytes: sanitizedBody.bytes }
        : raw
        ? raw.content
        : null,
      outcome: {
        decision,
        sanitized: sanitizedBody ? sanitizedBody.pointer : null,
      },
      input: {
        record: ctx.pointer,
        raw: raw ? raw.pointer : null,
      },
      error: decision.error,
    })

    // Encode a record of the sanitization with a pointer
    // to the raw response and sanitized record if applicable.
    const recordPath = yield* encodeSanitizedObservationPath(
      sanitizedObservation
    )
    const recordData = yield* encodeSanitizedObservation(sanitizedObservation)
    const recordMetadata = yield* encodeSanitizedObservationMeta(
      sanitizedObservation
    )
    // write the record to storage
    const recordPointer = yield* writeFile({
      path: recordPath,
      data: recordData,
      meta: recordMetadata,
    })
    yield* Effect.annotateLogsScoped({ 'record.object': recordPointer.object })

    // The event fields feed the ingestion dashboard, which counts one line per
    // event at info, so they are attached to this line only rather than
    // scoped. Every decision label, quarantines included, is logged at info.
    yield* Effect.logInfo('Record sanitized').pipe(
      Effect.annotateLogs(
        RecordSanitizedSchema.make({
          event: RecordSanitizedKey,
          'decision.label': decision.label,
          'decision.error': decision.error,
          'source.collection': observation.source.collection,
          'source.id': observation.source.id,
          'source.name': observation.source.name,
          'source.url': observation.source.url,
        })
      )
    )

    return recordPointer
  },
  Effect.scoped
)
