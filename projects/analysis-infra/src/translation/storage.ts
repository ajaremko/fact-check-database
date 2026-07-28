import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  analysisLabels,
  tag,
  retainStorageOnDelete,
  forceDestroyStorage,
} from '../config'
import { storageService } from '../services'
import { provider } from '../project'

const translationModelsBucket = new gcp.storage.Bucket(
  `${tag}-translation-models-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    labels: analysisLabels,
    forceDestroy: forceDestroyStorage,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
)

export const translationModelsBucketName = translationModelsBucket.name
