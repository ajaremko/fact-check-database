import { Schema } from 'effect'

export const IngestionJobCompletedKey = 'ingestor_job_completed'

export const IngestionJobCompletedSchema = Schema.Struct({
  event: Schema.Literal(IngestionJobCompletedKey),
  'job.successRate': Schema.Number,
  'job.tasks': Schema.Number,
  'job.successes': Schema.Number,
  'job.failures': Schema.Number,
  'job.result': Schema.String,
})
