import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry } from '../artifact-registry'
import { releaseWorkflowRef, tag } from '../config'
import { identityPool } from '../identity-pool'
import { provider } from '../project'
import { IAMService } from '../services'

/**
 * The release identity: the service account a GitHub Actions run impersonates
 * to push container images. It can do nothing else in the project.
 */
export const githubActionServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-github-actions-service-account`,
  {
    accountId: 'github-actions-sa',
    displayName: 'GitHub Actions Release Service Account',
    description:
      'Impersonated by the image release workflow to push to Artifact Registry',
  },
  { dependsOn: [IAMService], provider }
)

/**
 * The runs that may act as the release identity: those of one workflow file
 * on one branch of this repository. A run of any other workflow, or of the
 * same workflow on another branch, is refused.
 */
const releaseWorkflowPrincipal = pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.workflow_ref/${releaseWorkflowRef}`

/**
 * The binding that allows the release workflow to impersonate the service account
 */
export const githubActionServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-actions-service-account-workload-id-user-binding`,
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.workloadIdentityUser',
      member: releaseWorkflowPrincipal,
    },
    { provider }
  )

/**
 * The binding that allows the release workflow to create tokens for the service account
 */
export const githubActionTokenCreatorServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-actions-token-creator`,
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: releaseWorkflowPrincipal,
    },
    { provider }
  )

/**
 * The release identity's only grant: push and pull images in the shared
 * registry. Infrastructure is deployed by hand, not by this identity, so it
 * holds no project-level role.
 */
export const githubActionServiceAccountRegistryWriter =
  new gcp.artifactregistry.RepositoryIamMember(
    `${tag}-github-actions-service-account-registry-writer`,
    {
      repository: artifactRegistry.name,
      location: artifactRegistry.location,
      role: 'roles/artifactregistry.writer',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { provider }
  )
