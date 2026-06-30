// import { Config, Effect, Schema, pipe } from 'effect'

// import * as Node from '@news-research/core-data/Node'
// import {
//   QueueMessage,
//   takeError,
//   takeMessage,
// } from '@news-research/core-messaging'

// import { GCSNotificationSchema } from './StorageObjectData'
// import { loadBatch } from './loadBatch'

// const decodeIncoming = pipe(
//   GCSNotificationSchema,
//   Node.parseJson(),
//   Node.parseBuffer({ encoding: 'utf-8' }),
//   Schema.decode
// )

// function processMessage({
//   projectId,
//   datasetId,
//   tableId,
// }: {
//   projectId: string
//   datasetId: string
//   tableId: string
// }) {
//   return function (message: QueueMessage) {
//     return Effect.gen(function* () {
//       console.log(message.data.toString('utf-8'))
//       const incoming = yield* decodeIncoming(message.data)
//       yield* loadBatch({
//         projectId,
//         pointer: {
//           bucket: incoming.bucket,
//           object: incoming.name,
//         },
//         sourceFormat: incoming.contentType,
//         table: {
//           dataset: datasetId,
//           table: tableId,
//         },
//         schema: incoming.metadata,
//       })
//       yield* message.ack
//     }).pipe(
//       Effect.tapErrorCause(Effect.logError),
//       Effect.withSpan('processMessage'),
//       Effect.catchTags({
//         ParseError: () => message.ack,
//         BigQueryClientIOError: () => message.nack,
//       })
//     )
//   }
// }

// export const Program = Effect.gen(function* () {
//   const projectId = yield* Config.string('GOOGLE_CLOUD_PROJECT')
//   const datasetId = yield* Config.string('BIGQUERY_DATASET')
//   const tableId = yield* Config.string('BIGQUERY_TABLE')

//   const handleMessages = takeMessage.pipe(
//     Effect.andThen(processMessage({ projectId, datasetId, tableId })),
//     Effect.tapErrorCause(Effect.logError),
//     Effect.forever
//   )

//   const handleErrors = takeError.pipe(
//     Effect.andThen(Effect.fail),
//     Effect.tapErrorCause(Effect.logError)
//   )

//   yield* Effect.logInfo('Listening for messages...')

//   yield* Effect.all([handleMessages, handleErrors], {
//     concurrency: 'unbounded',
//   })
// })
