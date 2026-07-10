'use client'

import { useSearchBox, useHits } from 'react-instantsearch'
import { useMemo } from 'react'
import styled from 'styled-components'
import { Schema, Either } from 'effect'

import {
  SearchResultSchema,
  type SearchResult,
} from '@news-research/website-contracts/search/v1'

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

const CollectionBadge = styled.span`
  font-family: ${mono};
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${C.textMuted};
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 4px;
  padding: 0.15em 0.5em;
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

const decodeSearchResult = Schema.decodeUnknownEither(SearchResultSchema)

function decodeHits(hits: readonly unknown[]): SearchResult[] {
  const results: SearchResult[] = []
  for (const hit of hits) {
    const decoded = decodeSearchResult(hit)
    if (Either.isRight(decoded)) results.push(decoded.right)
    else console.error('Failed to decode search result hit', decoded.left)
  }
  return results
}

function formatDate(
  publishedAtNormalized: string | undefined,
  publishedAtRaw: Date | undefined
): string {
  if (publishedAtNormalized) return publishedAtNormalized
  if (publishedAtRaw) {
    return publishedAtRaw.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  return ''
}

type SortOption = 'newest' | 'oldest' | 'verdict'

function resolveVerdict(hit: SearchResult): string | undefined {
  return hit.verdict_normalized ?? hit.verdict_raw
}

function getTimestamp(hit: SearchResult): number {
  // published_at_raw is a real Date post-decode and sorts reliably; normalized
  // is a display string that's only parsed as a fallback.
  if (hit.published_at_raw) return hit.published_at_raw.getTime()
  if (hit.published_at_normalized) {
    const t = new Date(hit.published_at_normalized).getTime()
    return isNaN(t) ? 0 : t
  }
  return 0
}

function sortHits(
  hits: readonly SearchResult[],
  sort: SortOption
): SearchResult[] {
  const copy = [...hits]
  if (sort === 'newest')
    return copy.sort((a, b) => getTimestamp(b) - getTimestamp(a))
  if (sort === 'oldest')
    return copy.sort((a, b) => getTimestamp(a) - getTimestamp(b))
  return copy.sort((a, b) => {
    const av = resolveVerdict(a)
    const bv = resolveVerdict(b)
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    return av.localeCompare(bv)
  })
}

export function ResultListItem({
  href,
  title,
  verdict,
  source,
  collection,
  publishedAt,
}: {
  href?: string
  title: string
  verdict?: string
  source?: string
  collection?: string
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
        {collection && <CollectionBadge>{collection}</CollectionBadge>}
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
    collection?: string
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
          collection={item.collection}
          publishedAt={item.publishedAt}
        />
      ))}
    </ResultList>
  )
}

export function HitsWidgetLive({ sort }: { sort: SortOption }) {
  const { hits } = useHits()
  const { query } = useSearchBox()
  const sorted = useMemo(() => sortHits(decodeHits(hits), sort), [hits, sort])

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
        id: hit.ObjectID,
        href: hit.canonical_url,
        title: hit.title ?? hit.claim ?? 'Untitled',
        verdict: resolveVerdict(hit),
        source: hit.source_name,
        collection: hit.source_collection,
        publishedAt: formatDate(hit.published_at_normalized, hit.published_at_raw),
      }))}
    />
  )
}
