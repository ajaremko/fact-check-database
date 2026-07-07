import * as gcp from '@pulumi/gcp'

import { stackName, tag, verifiedDomains } from './config'
import { provider } from './project'
import { recaptchaService } from './services'

const webSettings =
  stackName === 'dev'
    ? {
        integrationType: 'SCORE',
        allowAllDomains: true,
      }
    : {
        integrationType: 'SCORE',
        allowedDomains: verifiedDomains,
      }

const recaptchaApiKey = new gcp.recaptcha.EnterpriseKey(
  `${tag}-recaptcha-key`,
  {
    displayName: 'Website reCAPTCHA Key',
    webSettings,
  },
  { provider, dependsOn: [recaptchaService] }
)

export const recaptchaApiKeyName = recaptchaApiKey.name
