import { createArchivedSubscription } from '../createArchivedSubscription'
import { sanitizerTopicName } from '../sanitizer'

export const {
  subscription: extractorSubscription,
  deadletterTopic: extractorDeadletterTopic,
  archiveSubscription: extractorDeadletterTopicArchiveSubscription,
} = createArchivedSubscription({
  topic: sanitizerTopicName,
  name: 'extractor-deadletter',
  archive: {
    messageRetentionDuration: '604800s', // 7 days
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'extractor-deadletter/',
      maxMessages: 1000,
    },
  },
})
