import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import {
  createArchivedSubscription,
  createInvokerServiceAccount,
} from '../shared'
import { ingestorTopicName } from '../ingestor'
import { provider } from '../project'
import { tag } from '../config'

import { sanitizerService } from './service'

export const {
  serviceAccount: sanitizerInvokerServiceAccount,
  serviceAccountInvoker: sanitizerInvokerServiceAccountInvoker,
} = createInvokerServiceAccount({
  name: 'sanitizer-push',
  serviceName: sanitizerService.name,
  displayName: 'Ingestion Sanitizer Invoker',
  type: 'service',
})

const sanitizerInvokerServiceAccountTokenCreator =
  new gcp.serviceaccount.IAMMember(
    `${tag}-sanitizer-push-token-creator`,
    {
      serviceAccountId: sanitizerInvokerServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${sanitizerInvokerServiceAccount.email}`,
    },
    { provider }
  )

export const {
  subscription: sanitizerSubscription,
  deadletterTopic: sanitizerDeadletterTopic,
  archiveSubscription: sanitizerDeadletterTopicArchiveSubscription,
} = createArchivedSubscription({
  name: 'sanitizer-deadletter',
  topic: ingestorTopicName,
  archive: {
    messageRetentionDuration: '604800s', // 7 days
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'sanitizer-deadletter/',
      maxMessages: 1000,
    },
  },
  retryPolicy: {
    minimumBackoff: '10s',
    maximumBackoff: '600s',
  },
  pushConfig: {
    pushEndpoint: pulumi.interpolate`${sanitizerService.uri}/ingestor-topic-messages`,
    oidcToken: {
      serviceAccountEmail: sanitizerInvokerServiceAccount.email,
    },
    attributes: {
      'x-goog-version': 'v1',
    },
  },
  dependsOn: [sanitizerInvokerServiceAccountTokenCreator],
})
