import * as gcp from '@pulumi/gcp'

export const observationsTopic = new gcp.pubsub.Topic('observations-topic', {
  name: 'observations-topic',
})
