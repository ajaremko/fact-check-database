import { Schema } from 'effect'

export const ExtractionJobCompletedKey = 'extractor_job_completed'

export const ExtractionJobCompletedSchema = Schema.Struct({
  event: Schema.Literal(ExtractionJobCompletedKey),
  'job.tasks': Schema.Number,
  'job.successes': Schema.Number,
  'job.failures': Schema.Number,
  'job.rowsExtracted': Schema.Number,
})
