import * as gcp from '@pulumi/gcp'

import { gcpRegion } from '../config'
import { websiteLabels, tag } from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const deadletterBucket = new gcp.storage.Bucket(
  `${tag}-deadletter-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: true,
    labels: websiteLabels,
  },
  {
    dependsOn: [storageService],
    provider,
  }
)
