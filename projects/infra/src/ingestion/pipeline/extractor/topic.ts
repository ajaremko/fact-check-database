import { createArchivedTopic } from '../createArchivedTopic'

export const {
  topic: extractorTopic,
  subscription: extractorTopicArchiveSubscription,
} = createArchivedTopic({
  name: 'extractor',
  archive: {
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'extractor-events/',
      maxMessages: 1000,
    },
  },
})
