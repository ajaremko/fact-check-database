import * as gcp from '@pulumi/gcp'

import { githubOrg, githubRepo, tag } from '../config'
import { identityPool } from '../identity-pool'
import { provider } from '../project'

export const githubActionIdentityPoolProvider =
  new gcp.iam.WorkloadIdentityPoolProvider(
    `${tag}-github-actions-identity-pool-provider`,
    {
      workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
      workloadIdentityPoolProviderId: 'github-actions-oidc-provider',
      displayName: 'GitHub Actions OIDC Provider',
      description: 'OIDC Provider for github actions',
      oidc: {
        issuerUri: 'https://token.actions.githubusercontent.com',
      },
      attributeMapping: {
        'google.subject': 'assertion.sub',
        'attribute.actor': 'assertion.actor',
        'attribute.repository': 'assertion.repository',
        // The workflow file and git ref a run comes from. Service account
        // bindings name one value of it, so each identity can be assumed by
        // exactly one workflow on one branch.
        'attribute.workflow_ref': 'assertion.workflow_ref',
      },
      attributeCondition: `assertion.repository == '${githubOrg}/${githubRepo}'`,
    },
    { provider }
  )
