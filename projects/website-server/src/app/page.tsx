'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { C, serif, mono } from '@/lib/theme'

// --- Layout ---

const PageWrapper = styled.div`
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
  min-height: 100vh;
  font-family: ${serif};
`

const Container = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

// --- Hero ---

const Hero = styled.section`
  padding: 5rem 0 3rem;
  text-align: center;
`

const Eyebrow = styled.p`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.accent};
  margin: 0 0 1.25rem;
`

const Headline = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  color: ${C.textPrimary};
  line-height: 1.2;
  margin: 0 0 1rem;
`

const Subtitle = styled.p`
  font-size: 1.0625rem;
  color: ${C.textSecondary};
  line-height: 1.75;
  margin: 0 0 2.5rem;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
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

// --- Footer ---

const Footer = styled.footer`
  border-top: 1px solid ${C.borderSubtle};
  padding: 2rem 0;
  text-align: center;
  color: ${C.textMuted};
  font-size: 0.85rem;
`

const FooterLink = styled.a`
  color: ${C.textMuted};
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: ${C.textSecondary};
  }
`

// --- Dummy Data ---

interface FactCheck {
  id: number
  title: string
  source: string
  verdict: 'true' | 'false' | 'misleading' | 'unsupported' | 'exaggerated'
  date: string
}

const RECORDS: FactCheck[] = [
  {
    id: 1,
    title: 'COVID-19 vaccines alter human DNA',
    source: 'FactCheck.org',
    verdict: 'false',
    date: 'Jan 12, 2026',
  },
  {
    id: 2,
    title: 'The 2020 U.S. election had historically low fraud rates',
    source: 'PolitiFact',
    verdict: 'true',
    date: 'Nov 3, 2025',
  },
  {
    id: 3,
    title: 'Drinking bleach cures coronavirus',
    source: 'Snopes',
    verdict: 'false',
    date: 'Mar 4, 2024',
  },
  {
    id: 4,
    title:
      'Global average temperatures have risen 1.1°C since pre-industrial times',
    source: 'Full Fact',
    verdict: 'true',
    date: 'Feb 17, 2026',
  },
  {
    id: 5,
    title: '5G towers spread COVID-19',
    source: 'Africa Check',
    verdict: 'false',
    date: 'Aug 9, 2024',
  },
  {
    id: 6,
    title: 'The U.S. national debt doubled under President Obama',
    source: 'PolitiFact',
    verdict: 'misleading',
    date: 'Oct 22, 2025',
  },
  {
    id: 7,
    title: 'Ivermectin is proven to cure COVID-19 in humans',
    source: 'AFP Fact Check',
    verdict: 'false',
    date: 'Sep 1, 2024',
  },
  {
    id: 8,
    title: "The UK's NHS spends more per capita than most EU countries",
    source: 'Full Fact',
    verdict: 'misleading',
    date: 'Apr 5, 2025',
  },
  {
    id: 9,
    title: 'Wind turbines cause cancer',
    source: 'Snopes',
    verdict: 'false',
    date: 'Jun 30, 2024',
  },
  {
    id: 10,
    title:
      'Electric vehicles produce more lifecycle emissions than petrol cars',
    source: 'AFP Fact Check',
    verdict: 'false',
    date: 'Dec 11, 2025',
  },
  {
    id: 11,
    title: 'The moon landing was faked by NASA in 1969',
    source: 'Snopes',
    verdict: 'false',
    date: 'Jul 20, 2024',
  },
  {
    id: 12,
    title: 'U.S. immigration courts have a backlog exceeding 3 million cases',
    source: 'FactCheck.org',
    verdict: 'true',
    date: 'Mar 19, 2025',
  },
  {
    id: 13,
    title: 'Vitamin C megadoses prevent COVID-19 infection',
    source: 'Africa Check',
    verdict: 'unsupported',
    date: 'Jan 28, 2024',
  },
  {
    id: 14,
    title:
      'Social media companies are legally required to remove hate speech in the EU',
    source: 'Full Fact',
    verdict: 'misleading',
    date: 'Nov 14, 2025',
  },
  {
    id: 15,
    title: 'Sea levels have risen by approximately 20cm over the past century',
    source: 'AFP Fact Check',
    verdict: 'true',
    date: 'Sep 23, 2025',
  },
  {
    id: 16,
    title: 'Microplastics have been found in human blood',
    source: 'LeadStories',
    verdict: 'true',
    date: 'May 3, 2025',
  },
  {
    id: 17,
    title: 'ChatGPT was trained on stolen copyrighted books',
    source: 'LeadStories',
    verdict: 'misleading',
    date: 'Feb 2, 2026',
  },
  {
    id: 18,
    title: 'Measles cases in Europe hit a 25-year high in 2024',
    source: 'AFP Fact Check',
    verdict: 'true',
    date: 'Jun 10, 2025',
  },
  {
    id: 19,
    title: 'Kenya has the highest rate of mobile banking adoption in the world',
    source: 'Africa Check',
    verdict: 'exaggerated',
    date: 'Mar 22, 2025',
  },
  {
    id: 20,
    title: 'The opioid crisis kills more Americans annually than car accidents',
    source: 'PolitiFact',
    verdict: 'true',
    date: 'Oct 8, 2025',
  },
  {
    id: 21,
    title: 'Bill Gates wants to use vaccines to implant microchips in people',
    source: 'Snopes',
    verdict: 'false',
    date: 'Aug 15, 2024',
  },
  {
    id: 22,
    title:
      'Solar panel production generates more CO₂ than the panels save in their lifetime',
    source: 'FactCheck.org',
    verdict: 'false',
    date: 'Apr 17, 2025',
  },
  {
    id: 23,
    title:
      'The Great Barrier Reef lost half its coral cover between 1995 and 2021',
    source: 'AFP Fact Check',
    verdict: 'true',
    date: 'Jan 7, 2026',
  },
  {
    id: 24,
    title: 'Crime rates in the U.S. are at a 50-year high',
    source: 'PolitiFact',
    verdict: 'false',
    date: 'Jul 4, 2025',
  },
  {
    id: 25,
    title:
      'AI-generated deepfakes were used to impersonate candidates in the 2024 election cycle',
    source: 'LeadStories',
    verdict: 'true',
    date: 'Dec 3, 2024',
  },
  {
    id: 26,
    title:
      'The EU has banned more than 1,000 food additives approved in the U.S.',
    source: 'Full Fact',
    verdict: 'misleading',
    date: 'Nov 29, 2025',
  },
  {
    id: 27,
    title: 'South Africa has the highest rate of HIV infections in the world',
    source: 'Africa Check',
    verdict: 'unsupported',
    date: 'Feb 20, 2025',
  },
  {
    id: 28,
    title: 'The U.S. federal minimum wage has not increased since 2009',
    source: 'FactCheck.org',
    verdict: 'true',
    date: 'Aug 1, 2025',
  },
  {
    id: 29,
    title: 'Eating red meat every day doubles your risk of heart disease',
    source: 'Snopes',
    verdict: 'exaggerated',
    date: 'May 18, 2025',
  },
  {
    id: 30,
    title:
      'A photo shows a polar bear on a street in Madrid due to climate change',
    source: 'AFP Fact Check',
    verdict: 'false',
    date: 'Jan 21, 2026',
  },
]

// --- Page ---

export default function HomePage() {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return RECORDS
    return RECORDS.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.verdict.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <PageWrapper>
      <Hero>
        <Container>
          <Eyebrow>Live Search</Eyebrow>
          <Headline>Search the Fact-Check Database</Headline>
          <Subtitle>
            Explore thousands of verified fact-checks from leading international
            organizations. Filter by claim, source, or verdict.
          </Subtitle>
        </Container>
      </Hero>

      <SearchSection>
        <Container>
          <SearchInputWrapper>
            <SearchIcon aria-hidden>&#128269;</SearchIcon>
            <SearchInput
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search claims, verdicts, or sources…"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </SearchInputWrapper>
          <SearchMeta>
            <span>
              {query.trim()
                ? `${results.length} result${
                    results.length !== 1 ? 's' : ''
                  } for "${query.trim()}"`
                : `${RECORDS.length} records indexed`}
            </span>
            <SearchMetaLink href="/dataset">
              About this dataset &rarr;
            </SearchMetaLink>
          </SearchMeta>
        </Container>
      </SearchSection>

      <ResultsSection>
        <Container>
          {results.length === 0 ? (
            <EmptyState>
              No records match &ldquo;{query}&rdquo;. Try a different claim,
              source, or verdict.
            </EmptyState>
          ) : (
            <ResultList>
              {results.map((r) => (
                <ResultItem key={r.id}>
                  <ResultHeader>
                    <ResultTitle>{r.title}</ResultTitle>
                    <VerdictBadge verdict={r.verdict}>{r.verdict}</VerdictBadge>
                  </ResultHeader>
                  <ResultMeta>
                    <ResultSource>{r.source}</ResultSource>
                    <span>{r.date}</span>
                  </ResultMeta>
                </ResultItem>
              ))}
            </ResultList>
          )}
        </Container>
      </ResultsSection>

      <Footer>
        <Container>
          The Fact Check Database 2026, maintained by Alfred Young &middot;{' '}
          <FooterLink href="mailto:alfredsyoung@gmail.com">
            alfredsyoung@gmail.com
          </FooterLink>
        </Container>
      </Footer>
    </PageWrapper>
  )
}
