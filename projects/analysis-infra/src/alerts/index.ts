import { alertEmailChannel } from './channel'
import { loaderDeadLetterAlertPolicy } from './loader-dead-letters'
import { transferFailureAlertPolicy } from './transfer-failures'

export const alertEmailChannelName = alertEmailChannel?.name

export const loaderDeadLetterAlertPolicyName = loaderDeadLetterAlertPolicy.name
export const transferFailureAlertPolicyName = transferFailureAlertPolicy.name
