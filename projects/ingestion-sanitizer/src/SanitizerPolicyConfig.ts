import { Context } from 'effect'

import type { SanitizerPolicy } from './sanitize'

export class SanitizerPolicyConfig extends Context.Tag('SanitizerPolicyConfig')<
  SanitizerPolicyConfig,
  SanitizerPolicy
>() {}
