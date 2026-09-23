import { createDeadletteredSubscription } from '../shared'
import { sanitizerTopicName } from '../sanitizer'

export const {
  subscription: extractorSubscription,
  deadletterTopic: extractorDeadletterTopic,
  archiveSubscription: extractorDeadletterTopicArchiveSubscription,
} = createDeadletteredSubscription({
  topic: sanitizerTopicName,
  name: 'extractor',
  // The extractor pulls a batch, extracts every message, writes the output
  // batch, and only then acknowledges (see core-io's CloudPubsubMessageBatch).
  // The deadline must cover that whole run, or Pub/Sub redelivers messages
  // that are still being processed and the next run extracts them again.
  ackDeadlineSeconds: 600,
  archive: {
    messageRetentionDuration: '604800s', // 7 days
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'extractor-deadletter/',
      maxMessages: 1000,
    },
  },
})
