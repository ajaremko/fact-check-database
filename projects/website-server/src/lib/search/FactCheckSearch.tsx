'use client'

import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { InstantSearch } from 'react-instantsearch'
import { liteClient as algoliasearch } from 'algoliasearch/lite'

import { C } from '@/lib/theme'

import { SearchBoxWidgetLive } from './SearchBoxWidget'
import { SearchBarRowLive } from './SearchBarRow'
import { HitsWidgetLive } from './HitsWidget'

// --- Layout ---

const Container = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

// --- Search ---

const SearchSection = styled.div`
  padding: 0 0 1.5rem;
`

// --- Results ---

const ResultsSection = styled.section`
  border-top: 1px solid ${C.borderSubtle};
  padding: 0.25rem 0 5rem;
`

const EmptyState = styled.div`
  padding: 4rem 0;
  text-align: center;
  color: ${C.textMuted};
  font-size: 0.9375rem;
`

type SortOption = 'newest' | 'oldest' | 'verdict'

// --- Component ---

interface Props {
  appId: string
  searchKey: string
  indexName: string
}

export default function FactCheckSearch({
  appId,
  searchKey,
  indexName,
}: Props) {
  const [sort, setSort] = useState<SortOption>('newest')

  function acquireSearchClient() {
    try {
      return algoliasearch(appId, searchKey)
    } catch (error) {
      console.error('Error initializing Algolia search client:', error)
      return null
    }
  }

  const searchClient = useMemo(acquireSearchClient, [appId, searchKey])

  if (!searchClient) {
    return (
      <EmptyState>
        Search is currently unavailable. Please try again later.
      </EmptyState>
    )
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <SearchSection>
        <Container>
          <SearchBoxWidgetLive />
          <SearchBarRowLive sort={sort} onSortChange={setSort} />
        </Container>
      </SearchSection>
      <ResultsSection>
        <Container>
          <HitsWidgetLive sort={sort} />
        </Container>
      </ResultsSection>
    </InstantSearch>
  )
}
