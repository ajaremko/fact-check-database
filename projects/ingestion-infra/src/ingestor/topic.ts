import { createArchivedTopic } from '../shared'

export const {
  topic: ingestorTopic,
  subscription: ingestorTopicArchiveSubscription,
} = createArchivedTopic({
  name: 'ingestor',
  archive: {
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'ingestor-events/',
      maxMessages: 1000,
    },
  },
})
