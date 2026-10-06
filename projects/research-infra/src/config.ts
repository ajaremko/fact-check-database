import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'research'

const researchConfig = new pulumi.Config('research')
export const gcpProject = researchConfig.require('project')
export const gcpRegion = researchConfig.require('region')

const analysisStackName = researchConfig.require('analysisStackName')
// Format: <organization>/<project>/<stack>
const analysisStackRef = new pulumi.StackReference(
  `${analysisStackName}/${stackName}`
)

// Retrieve exported artifact registry details
export const curatedTableRef = analysisStackRef.getOutput('curatedTableRef')

const coreStackName = researchConfig.require('coreStackName')
// Format: <organization>/<project>/<stack>
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)

export const coreProject = coreStackRef.getOutput('gcpProject')

/**
 * The read-only identity the scheduled `pulumi preview` workflow runs as,
 * owned by core-infra. Undefined until core-infra has been deployed with it.
 */
export const previewServiceAccountEmail = coreStackRef.getOutput(
  'githubPreviewServiceAccountEmail'
)

export const tableDeletionProtection =
  researchConfig.getBoolean('tableDeletionProtection') ?? true
export const retainTablesOnDelete =
  researchConfig.getBoolean('retainTablesOnDelete') ?? true

export const researchLabels: Record<string, string> = {
  env: stackName,
  tag,
}
