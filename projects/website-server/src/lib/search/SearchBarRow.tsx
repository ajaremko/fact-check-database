'use client'

import Link from 'next/link'
import styled from 'styled-components'
import { useSearchBox, useStats } from 'react-instantsearch'
import { ReactNode } from 'react'

import { C } from '@/lib/theme'

// --- Search ---

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

// --- Sort ---

const SortControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const SortLabel = styled.span`
  margin-right: 0.15rem;
`

const SortButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  color: ${({ $active }) => ($active ? C.accent : C.textMuted)};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  text-decoration: ${({ $active }) => ($active ? 'underline' : 'none')};
  text-underline-offset: 3px;

  &:hover {
    color: ${C.textSecondary};
  }
`

type SortOption = 'newest' | 'oldest' | 'verdict'

interface Props {
  caption: ReactNode
  sort: SortOption
  onSortChange: (s: SortOption) => void
}

export function SearchBarRow({ caption, sort, onSortChange }: Props) {
  return (
    <SearchMeta>
      <span>
        {caption}
        &nbsp;
        <SearchMetaLink href="/dataset">
          About this dataset &rarr;
        </SearchMetaLink>
      </span>
      <SortControls>
        <SortLabel>Sort:</SortLabel>
        <SortButton
          $active={sort === 'newest'}
          onClick={() => onSortChange('newest')}
        >
          Newest
        </SortButton>
        <span>·</span>
        <SortButton
          $active={sort === 'oldest'}
          onClick={() => onSortChange('oldest')}
        >
          Oldest
        </SortButton>
        <span>·</span>
        <SortButton
          $active={sort === 'verdict'}
          onClick={() => onSortChange('verdict')}
        >
          By verdict
        </SortButton>
      </SortControls>
    </SearchMeta>
  )
}

export function SearchBarRowLive({
  sort,
  onSortChange,
}: Omit<Props, 'caption'>) {
  const { query } = useSearchBox()
  const { nbHits } = useStats()
  const caption = query.trim()
    ? `${nbHits} result${nbHits !== 1 ? 's' : ''} for "${query.trim()}".`
    : `${nbHits.toLocaleString()} records indexed.`
  return (
    <SearchBarRow caption={caption} onSortChange={onSortChange} sort={sort} />
  )
}
