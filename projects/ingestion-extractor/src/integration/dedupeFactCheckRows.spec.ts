import { describe, it, expect } from 'vitest'

import { dedupeFactCheckRows } from './dedupeFactCheckRows'

const row = (
  overrides: Partial<{
    fact_check_id: string
    ingestor_run_id: string
    sourceId: string
    extractor_run_id: string
  }> = {}
) => ({
  fact_check_id: overrides.fact_check_id ?? 'fact-check-a',
  ingestor_run_id: overrides.ingestor_run_id ?? 'ingestor-run-1',
  extractor_run_id: overrides.extractor_run_id ?? 'extractor-run-1',
  source: { id: overrides.sourceId ?? 'snopes' },
})

describe('dedupeFactCheckRows', () => {
  it('collapses the same fact check from the same fetch attempt', () => {
    const rows = [row(), row(), row()]
    expect(dedupeFactCheckRows(rows)).toEqual([row()])
  })

  it('keeps the same fact check fetched by different ingestor runs', () => {
    const rows = [row(), row({ ingestor_run_id: 'ingestor-run-2' })]
    expect(dedupeFactCheckRows(rows)).toHaveLength(2)
  })

  it('keeps distinct fact checks and sources', () => {
    const rows = [
      row(),
      row({ fact_check_id: 'fact-check-b' }),
      row({ sourceId: 'politifact' }),
    ]
    expect(dedupeFactCheckRows(rows)).toHaveLength(3)
  })

  it('keeps the first occurrence and preserves order', () => {
    const first = row({ extractor_run_id: 'first' })
    const rows = [
      row({ fact_check_id: 'fact-check-b' }),
      first,
      row({ extractor_run_id: 'second' }),
    ]
    expect(dedupeFactCheckRows(rows)).toEqual([
      row({ fact_check_id: 'fact-check-b' }),
      first,
    ])
  })
})
