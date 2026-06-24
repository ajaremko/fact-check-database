import * as gcp from '@pulumi/gcp'

import { tag, verifiedDomains } from './config'
import { provider } from './project'

const recaptchaApiKey = new gcp.recaptcha.EnterpriseKey(
  `${tag}-recaptcha-key`,
  {
    displayName: 'Website reCAPTCHA Key',
    webSettings: {
      integrationType: 'SCORE',
      allowedDomains: verifiedDomains,
    },
  },
  { provider }
)

export const recaptchaApiKeyName = recaptchaApiKey.name
