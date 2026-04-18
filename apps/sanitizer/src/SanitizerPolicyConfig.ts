import { Context } from 'effect'

import type { SanitizerPolicy } from '@news-research/ingestion/steps/sanitize'

export class SanitizerPolicyConfig extends Context.Tag('SanitizerPolicyConfig')<
  SanitizerPolicyConfig,
  SanitizerPolicy
>() {}
