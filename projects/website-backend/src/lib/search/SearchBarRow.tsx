'use client'

import Link from 'next/link'
import styled from 'styled-components'
import { useSearchBox, useStats, useSortBy } from 'react-instantsearch'
import { Fragment, ReactNode } from 'react'

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

export interface SortItem {
  value: string
  label: string
}

interface Props {
  caption: ReactNode
  currentRefinement: string
  options: SortItem[]
  onRefine: (value: string) => void
}

export function SearchBarRow({
  caption,
  currentRefinement,
  options,
  onRefine,
}: Props) {
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
        {options.map((option, index) => (
          <Fragment key={option.value}>
            {index > 0 && <span>·</span>}
            <SortButton
              $active={option.value === currentRefinement}
              onClick={() => onRefine(option.value)}
            >
              {option.label}
            </SortButton>
          </Fragment>
        ))}
      </SortControls>
    </SearchMeta>
  )
}

export function SearchBarRowLive({ sortItems }: { sortItems: SortItem[] }) {
  const { query } = useSearchBox()
  const { nbHits } = useStats()
  const { currentRefinement, options, refine } = useSortBy({
    items: sortItems,
  })
  const caption = query.trim()
    ? `${nbHits} result${nbHits !== 1 ? 's' : ''} for "${query.trim()}".`
    : `${nbHits.toLocaleString()} records indexed.`
  return (
    <SearchBarRow
      caption={caption}
      currentRefinement={currentRefinement}
      options={options}
      onRefine={refine}
    />
  )
}
