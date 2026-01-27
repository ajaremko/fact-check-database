import * as gcp from '@pulumi/gcp'

import { IAMService, IAMCredentialsService } from './services'

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  'shared-identity-pool',
  {
    workloadIdentityPoolId: 'shared-identity-pool-01',
    displayName: 'Shared Identity Pool',
    description: 'Identity pool for shared services',
  },
  {
    dependsOn: [IAMService, IAMCredentialsService],
  }
)
