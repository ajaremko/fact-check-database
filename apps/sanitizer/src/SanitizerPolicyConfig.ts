import { Context } from 'effect'

import type { SanitizerPolicy } from '../../../packages/ingestion/dist/lib/steps/sanitize'

export class SanitizerPolicyConfig extends Context.Tag('SanitizerPolicyConfig')<
  SanitizerPolicyConfig,
  SanitizerPolicy
>() {}
