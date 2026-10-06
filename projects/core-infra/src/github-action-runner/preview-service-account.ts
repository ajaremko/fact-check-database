import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, previewWorkflowRef, tag } from '../config'
import { identityPool } from '../identity-pool'
import { provider } from '../project'
import { IAMService, resourceManagerService } from '../services'

/**
 * The preview identity: the service account the scheduled drift-preview
 * workflow impersonates. It can read resources and change nothing.
 */
export const githubPreviewServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-github-preview-service-account`,
  {
    accountId: 'github-preview-sa',
    displayName: 'GitHub Actions Preview Service Account',
    description:
      'Impersonated by the scheduled pulumi preview workflow; read-only',
  },
  { dependsOn: [IAMService], provider }
)

/**
 * The runs that may act as the preview identity: those of the preview
 * workflow file on one branch of this repository.
 */
const previewWorkflowPrincipal = pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.workflow_ref/${previewWorkflowRef}`

export const githubPreviewServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-preview-service-account-workload-id-user-binding`,
    {
      serviceAccountId: githubPreviewServiceAccount.name,
      role: 'roles/iam.workloadIdentityUser',
      member: previewWorkflowPrincipal,
    },
    { provider }
  )

export const githubPreviewTokenCreatorServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-preview-token-creator`,
    {
      serviceAccountId: githubPreviewServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: previewWorkflowPrincipal,
    },
    { provider }
  )

/**
 * Read-only access to this project, which is what a `pulumi preview` of the
 * stacks deployed here needs. Stacks in other projects grant the same role
 * on their own project.
 */
export const githubPreviewServiceAccountViewer = new gcp.projects.IAMMember(
  `${tag}-github-preview-service-account-viewer`,
  {
    project: gcpProject,
    role: 'roles/viewer',
    member: pulumi.interpolate`serviceAccount:${githubPreviewServiceAccount.email}`,
  },
  { dependsOn: [resourceManagerService], provider }
)
