import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { IAMService, IAMCredentialsService } from './services'
import { provider } from './provider'

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  `${tag}-shared-identity-pool`,
  {
    workloadIdentityPoolId: 'shared-identity-pool-03',
    displayName: 'Shared Identity Pool',
    description: 'Identity pool for shared services',
  },
  {
    dependsOn: [IAMService, IAMCredentialsService],
    provider,
  }
)
