import { Schema } from 'effect'

export const ExtractionJobCompletedSchema = Schema.Struct({
  event: Schema.Literal('extractor_job_completed'),
  'job.tasks': Schema.Number,
  'job.successes': Schema.Number,
  'job.failures': Schema.Number,
  'job.rowsExtracted': Schema.Number,
})
