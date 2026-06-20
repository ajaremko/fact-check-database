'use client'

import { useSearchBox, useHits } from 'react-instantsearch'
import { useMemo } from 'react'
import styled from 'styled-components'

import { C, mono } from '@/lib/theme'

// --- Results ---

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

interface SearchHit {
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

type SortOption = 'newest' | 'oldest' | 'verdict'

function getTimestamp(hit: SearchHit): number {
  const dateStr = hit.published_at ?? hit.raw_published_at
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  return isNaN(t) ? 0 : t
}

function sortHits(hits: readonly SearchHit[], sort: SortOption): SearchHit[] {
  const copy = [...hits]
  if (sort === 'newest')
    return copy.sort((a, b) => getTimestamp(b) - getTimestamp(a))
  if (sort === 'oldest')
    return copy.sort((a, b) => getTimestamp(a) - getTimestamp(b))
  return copy.sort((a, b) => {
    if (!a.verdict && !b.verdict) return 0
    if (!a.verdict) return 1
    if (!b.verdict) return -1
    return a.verdict.localeCompare(b.verdict)
  })
}

export function ResultListItem({
  href,
  title,
  verdict,
  source,
  publishedAt,
}: {
  href?: string
  title: string
  verdict?: string
  source?: string
  publishedAt?: string
}) {
  return (
    <ResultItem>
      <ResultHeader>
        <ResultTitle>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          ) : (
            title
          )}
        </ResultTitle>
        {verdict && <VerdictBadge verdict={verdict}>{verdict}</VerdictBadge>}
      </ResultHeader>
      <ResultMeta>
        <ResultSource>{source}</ResultSource>
        <span>{publishedAt}</span>
      </ResultMeta>
    </ResultItem>
  )
}

export function HitsWidget({
  items,
}: {
  items: {
    id: string
    href?: string
    title: string
    verdict?: string
    source?: string
    publishedAt?: string
  }[]
}) {
  return (
    <ResultList>
      {items.map((item) => (
        <ResultListItem
          key={item.id}
          href={item.href}
          title={item.title}
          verdict={item.verdict}
          source={item.source}
          publishedAt={item.publishedAt}
        />
      ))}
    </ResultList>
  )
}

export function HitsWidgetLive({ sort }: { sort: SortOption }) {
  const { hits } = useHits<SearchHit>()
  const { query } = useSearchBox()
  const sorted = useMemo(() => sortHits(hits, sort), [hits, sort])

  if (sorted.length === 0) {
    return (
      <EmptyState>
        {query.trim()
          ? `No records match "${query}". Try a different claim, source, or verdict.`
          : 'No records found.'}
      </EmptyState>
    )
  }

  return (
    <HitsWidget
      items={sorted.map((hit) => ({
        id: hit.objectID,
        href: hit.canonical_url ?? undefined,
        title: hit.title,
        verdict: hit.verdict ?? undefined,
        source: hit.source_name,
        publishedAt: formatDate(hit.published_at, hit.raw_published_at),
      }))}
    />
  )
}
