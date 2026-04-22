import { Effect } from 'effect'

import { Observation } from '../Observation'

import { ExtractedClaims } from '../Claim'

export interface ExtractionStrategy<E, R> {
  id: string
  canHandle: (source: { collection: string; name: string }) => boolean
  extractor: (input: {
    extractionId: string
    ingestionId: string
    observationId: string
    extractedAt: number
    record: Observation
    data: Uint8Array
  }) => Effect.Effect<ExtractedClaims, E, R>
}

export function makeExtractionStrategy<E, R>(
  strategy: ExtractionStrategy<E, R>
): ExtractionStrategy<E, R> {
  return strategy
}
