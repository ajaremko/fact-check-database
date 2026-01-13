import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { IAMService, IAMCredentialsService } from './services'
import { gcpProject, githubOrg, githubRepo } from './config'

export const githubActionServiceAccount = new gcp.serviceaccount.Account(
  'github-actions-service-account',
  {
    accountId: 'github-actions-sa',
    displayName: 'GitHub Actions Service Account',
    description: 'Service account for GitHub Actions to access GCP resources',
  }
)

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  'shared-identity-pool',
  {
    workloadIdentityPoolId: 'shared-identity-pool',
    displayName: 'Shared Identity Pool',
    description: 'Identity pool for shared services',
  },
  {
    dependsOn: [IAMService, IAMCredentialsService],
  }
)

export const githubActionOidcProvider =
  new gcp.iam.WorkloadIdentityPoolProvider('github-actions-oidc-provider', {
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
    },
    attributeCondition: `assertion.repository == '${githubOrg}/${githubRepo}'`,
  })

export const githubActionServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    'github-actions-service-account-workload-id-user-binding',
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.workloadIdentityUser',
      member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/${githubOrg}/${githubRepo}`,
    }
  )

export const githubActionServiceAccountEditorIamMember =
  new gcp.projects.IAMMember(
    'github-actions-service-account-editor-iam-member',
    {
      project: gcpProject,
      role: 'roles/editor',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount] }
  )

export const githubActionServiceAccountStorageAdminIamMember =
  new gcp.projects.IAMMember(
    'github-actions-service-account-serviceusage-admin-iam-member',
    {
      project: gcpProject,
      role: 'roles/serviceusage.serviceUsageAdmin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount] }
  )
