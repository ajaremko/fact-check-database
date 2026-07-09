import { Schema } from 'effect'

export const IngestionJobCompletedSchema = Schema.Struct({
  event: Schema.Literal('ingestor_job_completed'),
  'job.successRate': Schema.Number,
  'job.tasks': Schema.Number,
  'job.successes': Schema.Number,
  'job.failures': Schema.Number,
  'job.result': Schema.String,
})
