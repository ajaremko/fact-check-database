import {
  sourceListSecret,
  sourceListSecretVersion,
  sanitizerPolicySecret,
  sanitizerPolicySecretVersion,
} from './secrets'

export const sourceListSecretId = sourceListSecret.secretId
export const sourceListSecretVersionNumber = sourceListSecretVersion.version
export const sanitizerPolicySecretId = sanitizerPolicySecret.secretId
export const sanitizerPolicySecretVersionNumber =
  sanitizerPolicySecretVersion.version
