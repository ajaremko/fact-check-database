import { alertEmailChannel } from './channel'
import { deadLetterAlertPolicy } from './dead-letters'
import { extractorBacklogAlertPolicy } from './extractor-backlog'
import { jobFailureAlertPolicy } from './job-failures'

export const alertEmailChannelName = alertEmailChannel?.name

export const extractorBacklogAlertPolicyName = extractorBacklogAlertPolicy.name
export const deadLetterAlertPolicyName = deadLetterAlertPolicy.name
export const jobFailureAlertPolicyName = jobFailureAlertPolicy.name
