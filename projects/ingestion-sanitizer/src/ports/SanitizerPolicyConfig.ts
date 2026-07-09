import { Context } from 'effect'

import type { SanitizerPolicy } from '../contracts/SanitizerPolicy'

export class SanitizerPolicyConfig extends Context.Tag('SanitizerPolicyConfig')<
  SanitizerPolicyConfig,
  SanitizerPolicy
>() {}
