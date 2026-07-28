import * as gcp from '@pulumi/gcp'

import { gcpRegion, tag } from '../config'
import { provider } from '../project'
import { cloudRunService } from '../services'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  translationTranslatorServiceAccount,
  iamBindings,
} from './service-account'

export const translatorService = new gcp.cloudrunv2.Service(
  `${tag}-translation-translator-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: translationTranslatorServiceAccount.email,
      containers: [
        {
          image: 'libretranslate/libretranslate',
          resources: {
            limits: {
              memory: '1Gi',
              cpu: '1',
            },
          },
          envs: [],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunArtifactRegistryReader,
      cloudRunService,
      ...iamBindings,
    ],
    provider,
  }
)
