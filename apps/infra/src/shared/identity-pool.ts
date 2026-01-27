import * as gcp from '@pulumi/gcp'

import { IAMService, IAMCredentialsService } from './services'
import { provider } from './provider'

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  'shared-identity-pool',
  {
    workloadIdentityPoolId: 'shared-identity-pool-02',
    displayName: 'Shared Identity Pool',
    description: 'Identity pool for shared services',
  },
  {
    dependsOn: [IAMService, IAMCredentialsService],
    provider,
  }
)
