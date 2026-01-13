import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { IAMService, IAMCredentialsService } from './services'
import { gcpProject, githubOrg, githubRepo } from './config'

/**
 * The service account to be impersonated by GitHub Actions runner to access GCP resources
 */
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

/**
 * The binding that allows the GitHub Actions OIDC provider to impersonate the service account
 */
export const githubActionServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    'github-actions-service-account-workload-id-user-binding',
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.workloadIdentityUser',
      member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/${githubOrg}/${githubRepo}`,
    }
  )

/**
 * Broadly allow GitHub Actions service account to act as editor on the project.
 * This could be constrained further based on the specific needs of the project.
 */
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

/**
 * Allow GitHub Actions service account to enable cloud services.
 */
export const githubActionServiceAccountServiceAdminIamMember =
  new gcp.projects.IAMMember(
    'github-actions-service-account-serviceusage-admin-iam-member',
    {
      project: gcpProject,
      role: 'roles/serviceusage.serviceUsageAdmin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount] }
  )

/**
 * Allow GitHub Actions service account to enable cloud services.
 */
export const githubActionServiceAccountIamAdminIamMember =
  new gcp.projects.IAMMember(
    'github-actions-service-account-iam-admin-iam-member',
    {
      project: gcpProject,
      role: 'roles/iam.serviceAccountAdmin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount] }
  )
