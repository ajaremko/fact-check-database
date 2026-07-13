import { Effect } from 'effect'

import { Observation } from '../../app/Observation'
import { FactCheck } from '../../app/FactCheck'

export interface ExtractionStrategy<E, R> {
  id: string
  version: number
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
