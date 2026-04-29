import { Effect } from 'effect'

import { Observation } from '../Observation'

import { FactCheck } from '../FactCheck'

export interface ExtractionStrategy<E, R> {
  id: string
  canHandle: (source: { collection: string; name: string }) => boolean
  extractor: (input: {
    timestamp: number
    record: Observation
    data: Uint8Array
  }) => Effect.Effect<FactCheck[], E, R>
}

export function makeExtractionStrategy<E, R>(
  strategy: ExtractionStrategy<E, R>
): ExtractionStrategy<E, R> {
  return strategy
}
