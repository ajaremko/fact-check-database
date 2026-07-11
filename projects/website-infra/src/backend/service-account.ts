import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../config'
import { provider } from '../project'

import { envoyConfig, htpasswdConfig, oauth2ProxyConfig } from './envoy'
import { formSubmissionTopic } from './topic'
import { backendBucket } from './storage'

export const websiteBackendServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-backend-sa`,
  {
    accountId: `${tag}-backend-sa`,
    displayName: 'Website Backend Service Account',
  },
  { provider }
)

export const backendBucketObjectCreatorBinding =
  new gcp.storage.BucketIAMMember(
    `${tag}-backend-bucket-object-creator`,
    {
      bucket: backendBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
    },
    { provider }
  )

export const envoySecretAccessorBinding = new gcp.secretmanager.SecretIamMember(
  `${tag}-backend-envoy-secret-accessor`,
  {
    secretId: envoyConfig.secretId,
    role: 'roles/secretmanager.secretAccessor',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const htpasswdSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-backend-htpasswd-secret-accessor`,
    {
      secretId: htpasswdConfig.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
    },
    { provider }
  )

export const oauth2ProxySecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-backend-oauth2-proxy-secret-accessor`,
    {
      secretId: oauth2ProxyConfig.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
    },
    { provider }
  )

export const recaptchaEnterpriseAgent = new gcp.projects.IAMMember(
  `${tag}-backend-recaptcha-enterprise-agent`,
  {
    project: gcpProject,
    role: 'roles/recaptchaenterprise.agent',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const pubsubPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-backend-pubsub-publisher`,
  {
    topic: formSubmissionTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-backend-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-backend-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-backend-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const iamBindings = [
  backendBucketObjectCreatorBinding,
  recaptchaEnterpriseAgent,
  envoySecretAccessorBinding,
  htpasswdSecretAccessorBinding,
  oauth2ProxySecretAccessorBinding,
  pubsubPublisher,
  cloudtraceAgent,
  telemetryTracesWriter,
  monitoringMetricWriter,
]
