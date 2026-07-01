import { stagingStorageBucket } from './storage'

export const stagingStorageBucketName = stagingStorageBucket.name

import { stagingStorageTopic, stagingStorageUploadNofication } from './topic'

export const stagingStorageTopicName = stagingStorageTopic.name
export const stagingStorageUploadNoficationId =
  stagingStorageUploadNofication.notificationId

export { factChecksTableDBSchemaObjectUri } from './schema'
