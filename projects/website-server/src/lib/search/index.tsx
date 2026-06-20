'use client'

import dynamic from 'next/dynamic'
import styled, { keyframes } from 'styled-components'

import {
  Container,
  PageWrapper,
  SectionLabel,
  SiteFooter,
  SiteFooterMeta,
} from '@/lib/layout'
import { NavFooter } from '@/lib/navigation'
import { C } from '@/lib/theme'

// --- Skeleton ---

const skeletonPulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`

const SkeletonBlock = styled.div<{
  $height: string
  $width?: string
  $marginTop?: string
}>`
  background: ${C.bgSurface};
  border-radius: 4px;
  height: ${({ $height }) => $height};
  width: ${({ $width }) => $width ?? '100%'};
  margin-top: ${({ $marginTop }) => $marginTop ?? '0'};
  animation: ${skeletonPulse} 1.6s ease-in-out infinite;
`

const SkeletonSearchSection = styled.div`
  padding: 0 0 1.5rem;
`

const SkeletonResultsSection = styled.div`
  border-top: 1px solid ${C.borderSubtle};
  padding: 0.25rem 0 5rem;
`

const SkeletonInnerContainer = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

const SkeletonResultItem = styled.div<{ $last: boolean }>`
  border-bottom: ${({ $last }) => ($last ? 'none' : `1px solid ${C.borderSubtle}`)};
  padding: 1.25rem 0;
`

const SkeletonResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.3rem;
`

function SearchSkeleton() {
  return (
    <>
      <SkeletonSearchSection>
        <SkeletonInnerContainer>
          {/* mirrors SearchInput dimensions: padding 0.9rem × 2 + font ~17px + border 4px */}
          <SkeletonBlock $height="53px" />
          {/* mirrors SearchBarRow: margin-top 0.75rem + font 0.8rem */}
          <SkeletonBlock $height="13px" $width="38%" $marginTop="0.75rem" />
        </SkeletonInnerContainer>
      </SkeletonSearchSection>
      <SkeletonResultsSection>
        <SkeletonInnerContainer>
          {Array.from({ length: 10 }, (_, i) => (
            <SkeletonResultItem key={i} $last={i === 9}>
              <SkeletonResultHeader>
                <SkeletonBlock $height="22px" />
                <SkeletonBlock $height="22px" $width="70px" />
              </SkeletonResultHeader>
              <SkeletonBlock $height="13px" $width="42%" />
            </SkeletonResultItem>
          ))}
        </SkeletonInnerContainer>
      </SkeletonResultsSection>
    </>
  )
}

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
  loading: () => <SearchSkeleton />,
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
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
