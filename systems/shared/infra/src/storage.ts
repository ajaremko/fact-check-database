import * as gcp from '@pulumi/gcp'

import { archiveLocation, archiveTTL } from './config'
import { gcsArchiveKey } from './kms'

export const rawArchiveBucket = new gcp.storage.Bucket('raw-archive', {
  location: archiveLocation,
  uniformBucketLevelAccess: true,
  publicAccessPrevention: 'enforced',
  encryption: {
    defaultKmsKeyName: gcsArchiveKey.id,
  },
  lifecycleRules: [
    {
      action: { type: 'Delete' },
      condition: {
        age: archiveTTL,
      },
    },
  ],
})
