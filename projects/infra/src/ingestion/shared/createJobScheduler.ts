import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpRegion, gcpProject, tag } from '../config'
import { cloudSchedulerService } from '../services'
import { provider, schedulerServiceAgentEmail } from '../project'

// Creates a Cloud Scheduler job to triggers a Cloud Run Job
// on a configured schedule
export function createJobScheduler(opts: {
  name: string
  description: pulumi.Input<string>
  schedule: pulumi.Input<string>
  serviceName: pulumi.Input<string> // Name of the Cloud Run service to invoke
  serviceAccountName: pulumi.Input<string> // Name of invoker service account
  serviceAccountEmail: pulumi.Input<string> // Email of invoker service account
  dependsOn?: pulumi.Input<pulumi.Resource>[]
}) {
  const dependsOn = typeof opts.dependsOn !== 'undefined' ? opts.dependsOn : []
  /**
   * Allow Cloud Scheduler Service Agent to create OIDC tokens for the invoker service account.
   * This is required for Cloud Scheduler to authenticate when calling the Cloud Run job.
   */
  const schedulerTokenCreator = new gcp.serviceaccount.IAMMember(
    `${tag}-${opts.name}-token-creator`,
    {
      serviceAccountId: opts.serviceAccountName, // or invokerServiceAccount.id depending on provider versions
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${schedulerServiceAgentEmail}`,
    },
    { provider, dependsOn: [...dependsOn, cloudSchedulerService] }
  )

  return new gcp.cloudscheduler.Job(
    `${tag}-${opts.name}-scheduler-job`,
    {
      description: opts.description,
      schedule: opts.schedule,
      timeZone: 'UTC',
      httpTarget: {
        httpMethod: 'POST',
        uri: pulumi.interpolate`https://${gcpRegion}-run.googleapis.com/v2/projects/${gcpProject}/locations/${gcpRegion}/jobs/${opts.serviceName}:run`,
        oauthToken: {
          serviceAccountEmail: opts.serviceAccountEmail,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
        },
      },
    },
    {
      provider,
      dependsOn: [...dependsOn, cloudSchedulerService, schedulerTokenCreator],
    }
  )
}
