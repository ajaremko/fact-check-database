'use client'

import dynamic from 'next/dynamic'
import styled from 'styled-components'

import {
  Container,
  PageWrapper,
  SectionLabel,
  SiteFooter,
  SiteFooterMeta,
} from '@/lib/layout'
import { C } from '@/lib/theme'

// --- Hero ---

const Hero = styled.section`
  padding: 5rem 0 3rem;
  text-align: center;
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

// --- Dynamic search section ---

const FactCheckSearch = dynamic(() => import('@/lib/search/FactCheckSearch'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '40vh', background: C.bgBase }} />,
})

// --- Component ---

interface Props {
  appId: string
  searchKey: string
  indexName: string
}

export function Search({ appId, searchKey, indexName }: Props) {
  return (
    <PageWrapper>
      <Hero>
        <Container>
          <SectionLabel>Live Search</SectionLabel>
          <Headline>Search the Fact-Check Database</Headline>
          <Subtitle>
            Explore thousands of verified fact-checks from leading international
            organizations. Filter by claim, source, or verdict.
          </Subtitle>
        </Container>
      </Hero>

      <FactCheckSearch
        appId={appId}
        searchKey={searchKey}
        indexName={indexName}
      />

      <SiteFooter>
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
