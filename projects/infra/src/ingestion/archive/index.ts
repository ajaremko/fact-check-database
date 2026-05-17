import { deadletterBucket } from './deadletter-log'
import { archiveBucket } from './archive'
import { eventLogBucket } from './event-log'

export const deadletterBucketName = deadletterBucket.name

export const archiveBucketName = archiveBucket.name
export const eventLogBucketName = eventLogBucket.name
