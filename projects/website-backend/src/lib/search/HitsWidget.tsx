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

const ResultRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`

const ResultThumbnail = styled.img`
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid ${C.borderSubtle};
  flex-shrink: 0;
`

const ResultContent = styled.div`
  flex: 1;
  min-width: 0;
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

const ResultAuthor = styled.p`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  margin: 0 0 0.35rem;
`

const ResultSummary = styled.p`
  font-size: 0.8125rem;
  color: ${C.textSecondary};
  line-height: 1.5;
  margin: 0 0 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CategoryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 0.5rem;
`

const CategoryTag = styled.span`
  font-size: 0.7rem;
  color: ${C.textSecondary};
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 4px;
  padding: 0.15em 0.5em;
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

  &:hover {
    text-decoration: underline;
  }
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
  console.log('hits', JSON.stringify(results, null, 2))
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
      timeZone: 'UTC',
    })
  }
  return ''
}

function formatExtractedAt(extractedAt: Date | undefined): string {
  if (!extractedAt) return ''
  return extractedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
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
  summary,
  verdict,
  source,
  sourceUrl,
  collection,
  publishedAt,
  imageUrl,
  language,
  author,
  categories,
  extractedAt,
}: {
  href?: string
  title: string
  summary?: string
  verdict?: string
  source?: string
  sourceUrl?: string
  collection?: string
  publishedAt?: string
  imageUrl?: string
  language?: string
  author?: string
  categories?: readonly string[]
  extractedAt?: string
}) {
  return (
    <ResultItem>
      <ResultRow>
        {imageUrl && <ResultThumbnail src={imageUrl} alt="" />}
        <ResultContent>
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
            {verdict && (
              <VerdictBadge verdict={verdict}>{verdict}</VerdictBadge>
            )}
          </ResultHeader>
          {author && <ResultAuthor>By {author}</ResultAuthor>}
          {summary && <ResultSummary>{summary}</ResultSummary>}
          {categories && categories.length > 0 && (
            <CategoryList>
              {categories.map((category) => (
                <CategoryTag key={category}>{category}</CategoryTag>
              ))}
            </CategoryList>
          )}
          <ResultMeta>
            {sourceUrl ? (
              <ResultSource
                as="a"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source}
              </ResultSource>
            ) : (
              <ResultSource>{source}</ResultSource>
            )}
            {collection && <CollectionBadge>{collection}</CollectionBadge>}
            {language && <CollectionBadge>{language}</CollectionBadge>}
            <span>{publishedAt}</span>
            {extractedAt && <span>checked {extractedAt}</span>}
          </ResultMeta>
        </ResultContent>
      </ResultRow>
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
    summary?: string
    verdict?: string
    source?: string
    sourceUrl?: string
    collection?: string
    publishedAt?: string
    imageUrl?: string
    language?: string
    author?: string
    categories?: readonly string[]
    extractedAt?: string
  }[]
}) {
  return (
    <ResultList>
      {items.map((item) => (
        <ResultListItem
          key={item.id}
          href={item.href}
          title={item.title}
          summary={item.summary}
          verdict={item.verdict}
          source={item.source}
          sourceUrl={item.sourceUrl}
          collection={item.collection}
          publishedAt={item.publishedAt}
          imageUrl={item.imageUrl}
          language={item.language}
          author={item.author}
          categories={item.categories}
          extractedAt={item.extractedAt}
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
          ? `No records match "${query}". Try a different title, source, or verdict.`
          : 'No records found.'}
      </EmptyState>
    )
  }

  return (
    <HitsWidget
      items={sorted.map((hit) => ({
        id: hit.objectID,
        href: hit.canonical_url ?? hit.link,
        title: hit.title ?? 'Untitled',
        summary: hit.summary,
        verdict: resolveVerdict(hit),
        source: hit.source_name,
        sourceUrl: hit.source_url,
        collection: hit.source_collection,
        publishedAt: formatDate(
          hit.published_at_normalized,
          hit.published_at_raw
        ),
        imageUrl: hit.image_url,
        language: hit.language,
        author: hit.author,
        categories: hit.categories,
        extractedAt: formatExtractedAt(hit.extracted_at),
      }))}
    />
  )
}
