import * as github from '@pulumi/github'

import { githubRepo, stackSuffix, gcpProject } from './config'

export const githubActionProjectIdVar = new github.ActionsVariable(
  'github-actions-project-id-var',
  {
    repository: githubRepo,
    variableName: `GCP_PROJECT_ID_${stackSuffix}`,
    value: gcpProject,
  }
)
