import { Effect } from 'effect'

import { SanitizerRecord } from '../../data'

type Row = {
  observation_id: string
  run_id: string
  url: string
  final_url: string
  title: string | null
  claim: string | null
  verdict: string | null
  published_at: Date | null
  fetched_at: Date
  extracted_at: Date
  source: unknown
  http: unknown
  content: unknown
  policy: unknown
}

type Source = {
  collection: string
  name: string
}

export interface Extractor<E, R> {
  id: string
  canHandle: (source: Source) => boolean
  extract: (
    record: SanitizerRecord,
    content: Uint8Array
  ) => Effect.Effect<Row[], E, R>
}

export function makeExtractor<E, R>(
  extractor: Extractor<E, R>
): Extractor<E, R> {
  return extractor
}
