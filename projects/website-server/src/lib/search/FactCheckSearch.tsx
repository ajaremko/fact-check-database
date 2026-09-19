'use client'

import { useMemo } from 'react'
import styled from 'styled-components'
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
} from 'react-instantsearch'
import type { InstantSearchServerState } from 'react-instantsearch'
import { liteClient as algoliasearch } from 'algoliasearch/lite'

import { C } from '@/lib/theme'

import { SearchBoxWidgetLive } from './SearchBoxWidget'
import { SearchBarRowLive, type SortItem } from './SearchBarRow'
import { HitsWidgetLive, PaginationWidgetLive } from './HitsWidget'

const HITS_PER_PAGE = 20

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

// --- Component ---

interface Props {
  appId: string
  searchKey: string
  indexName: string
  oldestIndexName: string
  serverState?: InstantSearchServerState
}

export default function FactCheckSearch({
  appId,
  searchKey,
  indexName,
  oldestIndexName,
  serverState,
}: Props) {
  const sortItems: SortItem[] = useMemo(
    () =>
      [
        { value: indexName, label: 'Newest' },
        { value: oldestIndexName, label: 'Oldest' },
      ].filter((item) => item.value),
    [indexName, oldestIndexName]
  )

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
    <InstantSearchSSRProvider {...(serverState ?? {})}>
      <InstantSearch searchClient={searchClient} indexName={indexName}>
        <Configure hitsPerPage={HITS_PER_PAGE} />
        <SearchSection>
          <Container>
            <SearchBoxWidgetLive />
            <SearchBarRowLive sortItems={sortItems} />
          </Container>
        </SearchSection>
        <ResultsSection>
          <Container>
            <HitsWidgetLive />
            <PaginationWidgetLive />
          </Container>
        </ResultsSection>
      </InstantSearch>
    </InstantSearchSSRProvider>
  )
}
