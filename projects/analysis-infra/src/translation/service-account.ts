import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../project'

import { translationModelsBucketName } from './storage'

export const translationTranslatorServiceAccount =
  new gcp.serviceaccount.Account(
    `${tag}-translation-translator-sa`,
    {
      accountId: `${tag}-translator-sa`,
      displayName: 'Translation Translator (Analysis)',
    },
    { provider }
  )

export const translationTranslatorModelsBucketViewer =
  new gcp.storage.BucketIAMMember(
    `${tag}-translation-translator-models-bucket-viewer`,
    {
      bucket: translationModelsBucketName,
      role: 'roles/storage.objectViewer',
      member: pulumi.interpolate`serviceAccount:${translationTranslatorServiceAccount.email}`,
    },
    { provider }
  )

export const iamBindings = [translationTranslatorModelsBucketViewer]
