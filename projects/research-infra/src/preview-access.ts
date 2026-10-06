import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  coreProject,
  gcpProject,
  previewServiceAccountEmail,
  tag,
} from './config'
import { provider } from './project'

/**
 * Lets the scheduled `pulumi preview` workflow read this stack's project, so
 * it can report changes that are in the code and have not been deployed. The
 * role is read-only.
 *
 * The grant is made here only when this stack has a project of its own. Where
 * it shares core-infra's project, as in dev, core-infra's own grant already
 * covers it. It is also skipped until core-infra has been deployed with the
 * preview identity.
 */
export const previewServiceAccountViewer = pulumi
  .all([coreProject, previewServiceAccountEmail])
  .apply(([core, email]) =>
    core === gcpProject || !email
      ? undefined
      : new gcp.projects.IAMMember(
          `${tag}-github-preview-service-account-viewer`,
          {
            project: gcpProject,
            role: 'roles/viewer',
            member: `serviceAccount:${email}`,
          },
          { provider }
        )
  )
