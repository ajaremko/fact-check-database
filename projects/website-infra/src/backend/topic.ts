import * as gcp from '@pulumi/gcp'

import { tag, websiteLabels } from '../config'
import { pubsubService } from '../services'
import { provider } from '../project'

export const formSubmissionTopic = new gcp.pubsub.Topic(
  `${tag}-form-submissions-topic`,
  { labels: websiteLabels },
  { dependsOn: [pubsubService], provider }
)
