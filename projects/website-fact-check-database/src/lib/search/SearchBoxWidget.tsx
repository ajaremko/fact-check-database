'use client'

import styled from 'styled-components'
import { useSearchBox } from 'react-instantsearch'

import { C, serif } from '@/lib/theme'

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

// --- Search Widgets ---

export function SearchBoxWidget({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <SearchInputWrapper>
      <SearchIcon aria-hidden>&#128269;</SearchIcon>
      <SearchInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search claims or sources…"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
    </SearchInputWrapper>
  )
}

export function SearchBoxWidgetLive() {
  const { query, refine } = useSearchBox()
  return <SearchBoxWidget value={query} onChange={refine} />
}
