'use client'

import Link from 'next/link'
import styled from 'styled-components'
import {
  InstantSearch,
  useSearchBox,
  useHits,
  useStats,
} from 'react-instantsearch'
import { liteClient as algoliasearch } from 'algoliasearch/lite'

import { C, serif, mono } from '@/lib/theme'

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

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 1rem;
  color: ${C.textMuted};
  font-style: normal;
  font-size: 1rem;
  pointer-events: none;
  line-height: 1;
`

const SearchInput = styled.input`
  width: 100%;
  font-family: ${serif};
  font-size: 1.0625rem;
  color: ${C.textPrimary};
  background: ${C.bgBase};
  border: 2px solid ${C.borderSubtle};
  border-radius: 8px;
  padding: 0.9rem 1rem 0.9rem 2.75rem;
  outline: none;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: ${C.textMuted};
  }

  &:focus {
    border-color: ${C.accent};
  }
`

const SearchMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: ${C.textMuted};
`

const SearchMetaLink = styled(Link)`
  color: ${C.textMuted};
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: ${C.textSecondary};
  }
`

// --- Results ---

const ResultsSection = styled.section`
  border-top: 1px solid ${C.borderSubtle};
  padding: 0.25rem 0 5rem;
`

const ResultList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

const ResultItem = styled.li`
  border-bottom: 1px solid ${C.borderSubtle};
  padding: 1.25rem 0;

  &:last-child {
    border-bottom: none;
  }
`

const ResultHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.3rem;
`

const ResultTitle = styled.p`
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  line-height: 1.5;
  margin: 0;
  flex: 1;
`

const VERDICT_STYLES: Record<string, { bg: string; color: string }> = {
  true: { bg: '#dcfce7', color: '#166534' },
  false: { bg: '#fee2e2', color: '#991b1b' },
  misleading: { bg: '#fef3c7', color: '#92400e' },
  unsupported: { bg: '#f3f4f6', color: '#374151' },
  exaggerated: { bg: '#ffedd5', color: '#9a3412' },
}

const VerdictBadge = styled.span<{ verdict: string }>`
  display: inline-block;
  flex-shrink: 0;
  font-family: ${mono};
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2em 0.55em;
  border-radius: 4px;
  background-color: ${({ verdict }) =>
    VERDICT_STYLES[verdict]?.bg ?? '#f3f4f6'};
  color: ${({ verdict }) => VERDICT_STYLES[verdict]?.color ?? '#374151'};
`

const ResultMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: ${C.textMuted};
`

const ResultSource = styled.span`
  font-weight: 500;
`

const EmptyState = styled.div`
  padding: 4rem 0;
  text-align: center;
  color: ${C.textMuted};
  font-size: 0.9375rem;
`

// --- Algolia ---

interface AlgoliaHit {
  objectID: string
  source_name: string
  title: string
  claim: string
  summary: string
  verdict: string | null
  published_at: string | null
  raw_published_at: string | null
  canonical_url: string | null
  language: string | null
  collection: string
}

function formatDate(
  published_at: string | null,
  raw_published_at: string | null
): string {
  const dateStr = published_at ?? raw_published_at
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// --- Search Widgets ---

function SearchBoxWidget() {
  const { query, refine } = useSearchBox()
  return (
    <SearchInputWrapper>
      <SearchIcon aria-hidden>&#128269;</SearchIcon>
      <SearchInput
        type="search"
        value={query}
        onChange={(e) => refine(e.target.value)}
        placeholder="Search claims, verdicts, or sources…"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
    </SearchInputWrapper>
  )
}

function SearchMetaWidget() {
  const { query } = useSearchBox()
  const { nbHits } = useStats()
  return (
    <SearchMeta>
      <span>
        {query.trim()
          ? `${nbHits} result${nbHits !== 1 ? 's' : ''} for "${query.trim()}"`
          : `${nbHits.toLocaleString()} records indexed`}
      </span>
      <SearchMetaLink href="/dataset">About this dataset &rarr;</SearchMetaLink>
    </SearchMeta>
  )
}

function HitsWidget() {
  const { hits } = useHits<AlgoliaHit>()
  const { query } = useSearchBox()

  if (hits.length === 0) {
    return (
      <EmptyState>
        {query.trim()
          ? `No records match "${query}". Try a different claim, source, or verdict.`
          : 'No records found.'}
      </EmptyState>
    )
  }

  return (
    <ResultList>
      {hits.map((hit) => (
        <ResultItem key={hit.objectID}>
          <ResultHeader>
            <ResultTitle>
              {hit.canonical_url ? (
                <a
                  href={hit.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hit.title}
                </a>
              ) : (
                hit.title
              )}
            </ResultTitle>
            {hit.verdict && (
              <VerdictBadge verdict={hit.verdict}>{hit.verdict}</VerdictBadge>
            )}
          </ResultHeader>
          <ResultMeta>
            <ResultSource>{hit.source_name}</ResultSource>
            <span>{formatDate(hit.published_at, hit.raw_published_at)}</span>
          </ResultMeta>
        </ResultItem>
      ))}
    </ResultList>
  )
}

// --- Component ---

function SafeFactCheckSearch() {
  try {
    const searchClient = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '',
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? ''
    )
    const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? ''
    return function FactCheckSearch() {
      return (
        <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
          <SearchSection>
            <Container>
              <SearchBoxWidget />
              <SearchMetaWidget />
            </Container>
          </SearchSection>
          <ResultsSection>
            <Container>
              <HitsWidget />
            </Container>
          </ResultsSection>
        </InstantSearch>
      )
    }
  } catch (error) {
    console.error('Error initializing Algolia search client:', error)
    return function FactCheckSearch() {
      return (
        <div style={{ minHeight: '100vh', background: '#faf8f4' }}>
          <p
            style={{ padding: '2rem', color: C.textMuted, textAlign: 'center' }}
          >
            Failed to load search functionality. Please try again later.
          </p>
        </div>
      )
    }
  }
}

export default SafeFactCheckSearch()
