import * as gcp from '@pulumi/gcp'

import { gcpRegion } from './config'
import { provider } from './provider'
import { cloudRunService } from './services'

export const helloService = new gcp.cloudrunv2.Service(
  'hello-service',
  {
    location: gcpRegion,
    template: {
      containers: [
        {
          image: 'gcr.io/cloudrun/hello',
        },
      ],
    },
  },
  { dependsOn: [cloudRunService], provider }
)

// Make the service publicly accessible by granting the 'roles/run.invoker' role to 'allUsers'
export const iamHello = new gcp.cloudrunv2.ServiceIamMember(
  'hello-everyone',
  {
    name: helloService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider }
)
