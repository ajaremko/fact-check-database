import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpRegion, tag } from '../config'
import { provider } from '../project'

// Creates a service account with the necessary permissions
// to invoke a Cloud Run service
export function createInvokerServiceAccount(opts: {
  name: string
  serviceName: pulumi.Input<string>
  displayName: pulumi.Input<string>
  type: 'service' | 'job'
}) {
  const serviceAccount = new gcp.serviceaccount.Account(
    `${tag}-${opts.name}-sa`,
    {
      accountId: `${tag}-${opts.name}-sa`,
      displayName: opts.displayName,
    },
    { provider }
  )

  if (opts.type === 'service') {
    const serviceAccountInvoker = new gcp.cloudrunv2.ServiceIamMember(
      `${tag}-${opts.name}-invoker`,
      {
        name: opts.serviceName,
        location: gcpRegion,
        role: 'roles/run.invoker',
        member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
      },
      { provider }
    )

    return {
      serviceAccount,
      serviceAccountInvoker,
    }
  }
  const serviceAccountInvoker = new gcp.cloudrunv2.JobIamMember(
    `${tag}-${opts.name}-invoker`,
    {
      name: opts.serviceName,
      location: gcpRegion,
      role: 'roles/run.invoker',
      member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
    },
    { provider }
  )

  return {
    serviceAccount,
    serviceAccountInvoker,
  }
}
