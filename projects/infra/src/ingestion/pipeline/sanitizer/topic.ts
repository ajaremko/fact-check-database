import { createArchivedTopic } from '../createArchivedTopic'

export const {
  topic: sanitizerTopic,
  subscription: sanitizerTopicArchiveSubscription,
} = createArchivedTopic({
  name: 'sanitizer',
  archive: {
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'sanitizer-events/',
      maxMessages: 1000,
    },
  },
})
