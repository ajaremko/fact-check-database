import { FetchResult } from './FetchResult'
import { SourceTarget } from './SourceTarget'

export type FetchAttempt = {
  runId: string
  fetchedAt: number
  result: FetchResult
  source: SourceTarget
}
