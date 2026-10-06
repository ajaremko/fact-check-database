'use client'

import { useSearchBox, useHits, usePagination } from 'react-instantsearch'
import { useMemo } from 'react'
import styled from 'styled-components'
import { Schema, Either } from 'effect'

import {
  SearchResultSchema,
  type SearchResult,
} from '@fact-check-database/website-contracts/search/v1'

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

  a {
    text-decoration: underline;

    &:visited {
      color: ${C.textMuted};
    }
  }
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

// --- Pagination ---

const PaginationNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding-top: 1.5rem;
`

const PageButton = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  padding: 0.15em 0.4em;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  color: ${({ $active }) => ($active ? C.accent : C.textMuted)};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  text-decoration: ${({ $active }) => ($active ? 'underline' : 'none')};
  text-underline-offset: 3px;

  &:disabled {
    color: ${C.borderSubtle};
    cursor: default;
  }

  &:not(:disabled):hover {
    color: ${C.textSecondary};
  }
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

// Shows the parsed publication date when there is one, and otherwise the
// publisher's own date string as written
function formatDate(
  publishedAtNormalized: Date | undefined,
  publishedAtRaw: string | undefined
): string {
  if (publishedAtNormalized && !Number.isNaN(publishedAtNormalized.getTime())) {
    return publishedAtNormalized.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  }
  return publishedAtRaw ?? ''
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

export function ResultListItem({
  href,
  title,
  summary,
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

export function HitsWidgetLive() {
  const { hits } = useHits()
  const { query } = useSearchBox()
  const decoded = useMemo(() => decodeHits(hits), [hits])

  if (decoded.length === 0) {
    return (
      <EmptyState>
        {query.trim()
          ? `No records match "${query}". Try a different title or source.`
          : 'No records found.'}
      </EmptyState>
    )
  }

  return (
    <HitsWidget
      items={decoded.map((hit) => ({
        id: hit.objectID,
        href: hit.canonical_url ?? hit.link,
        title: hit.title ?? 'Untitled',
        summary: hit.summary,
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

export function PaginationWidgetLive() {
  const { pages, currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination({ padding: 2 })

  if (nbPages <= 1) return null

  return (
    <PaginationNav aria-label="Search results pages">
      <PageButton disabled={isFirstPage} onClick={() => refine(0)}>
        First
      </PageButton>
      <PageButton
        disabled={isFirstPage}
        onClick={() => refine(currentRefinement - 1)}
      >
        Prev
      </PageButton>
      {pages.map((page) => (
        <PageButton
          key={page}
          $active={page === currentRefinement}
          onClick={() => refine(page)}
        >
          {page + 1}
        </PageButton>
      ))}
      <PageButton
        disabled={isLastPage}
        onClick={() => refine(currentRefinement + 1)}
      >
        Next
      </PageButton>
      <PageButton disabled={isLastPage} onClick={() => refine(nbPages - 1)}>
        Last
      </PageButton>
    </PaginationNav>
  )
}
