import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { cloudRunServiceAgentEmail, coreProvider } from './project'
import { coreProject, artifactRegistryName, tag } from './config'

export const cloudRunArtifactRegistryReader =
  new gcp.artifactregistry.RepositoryIamMember(
    `${tag}-cloud-run-service-agent-binding`,
    {
      role: 'roles/artifactregistry.reader',
      member: pulumi.interpolate`serviceAccount:${cloudRunServiceAgentEmail}`,
      project: coreProject,
      repository: artifactRegistryName,
    },
    { provider: coreProvider, retainOnDelete: true }
  )
