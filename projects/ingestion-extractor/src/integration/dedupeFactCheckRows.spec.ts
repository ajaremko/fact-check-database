import { describe, it, expect } from 'vitest'

import { dedupeFactCheckRows } from './dedupeFactCheckRows'

describe('dedupeFactCheckRows', () => {
  it('collapses the same fact check from the same fetch attempt', () => {
    const result = dedupeFactCheckRows([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
    ])
    expect(result).toEqual([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
    ])
  })

  it('keeps the same fact check fetched by different ingestor runs', () => {
    const result = dedupeFactCheckRows([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-2',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
    ])
    expect(result).toEqual([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-2',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
    ])
  })

  it('keeps distinct fact checks and sources', () => {
    const result = dedupeFactCheckRows([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-b',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'politifact' },
      },
    ])
    expect(result).toEqual([
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-b',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'politifact' },
      },
    ])
  })

  it('keeps the first occurrence and preserves order', () => {
    const result = dedupeFactCheckRows([
      {
        fact_check_id: 'fact-check-b',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'first',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'second',
        source: { id: 'snopes' },
      },
    ])
    expect(result).toEqual([
      {
        fact_check_id: 'fact-check-b',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'extractor-run-1',
        source: { id: 'snopes' },
      },
      {
        fact_check_id: 'fact-check-a',
        ingestor_run_id: 'ingestor-run-1',
        extractor_run_id: 'first',
        source: { id: 'snopes' },
      },
    ])
  })
})
