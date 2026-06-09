'use client'

import dynamic from 'next/dynamic'
import styled from 'styled-components'

import { C, serif } from '@/lib/theme'

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
          <Eyebrow>Live Search</Eyebrow>
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

      <Footer>
        <Container>
          The Fact Check Database 2026
          <br />
          Build #{process.env.NEXT_PUBLIC_BUILD_NUMBER}
          <br />
          <span>Created and maintained by Alfred Young &middot; </span>
          <FooterLink href="mailto:alfredsyoung@gmail.com">
            alfredsyoung@gmail.com
          </FooterLink>
        </Container>
      </Footer>
    </PageWrapper>
  )
}
