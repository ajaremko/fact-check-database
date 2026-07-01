'use client'

import styled from 'styled-components'

import {
  BodyText,
  Container,
  PageWrapper,
  SectionDivider,
  SectionLabel,
  SiteFooter,
  SiteFooterMeta,
} from '@/lib/layout'
import { NavFooter } from '@/lib/navigation'
import { C } from '@/lib/theme'

// --- Page Header ---

const PageHeader = styled.header`
  padding: 5rem 0 3rem;
`

const PageTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  color: ${C.textPrimary};
  line-height: 1.2;
  margin: 0 0 1rem;
`

// --- Content ---

const ContentSection = styled.section`
  padding: 4rem 0;
`

const TermsHeading = styled.h2`
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 2rem 0 0.5rem;
`

const LastUpdated = styled.p`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  margin: 0 0 2rem;
`

// --- Page ---

export function Terms() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Legal</SectionLabel>
          <PageTitle>Terms of Service</PageTitle>
          <BodyText>
            By using the Fact Check Database website and any data made available
            through it, you agree to the following terms.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <LastUpdated>Last updated: June 2026</LastUpdated>

          <TermsHeading>Permitted Use</TermsHeading>
          <BodyText>
            The search interface and public dataset metadata are provided for
            research, journalism, and educational purposes. Automated scraping
            of search results at scale, resale of data, or use in systems that
            amplify or target individual subjects named in fact-checks is
            prohibited.
          </BodyText>

          <TermsHeading>Dataset Access</TermsHeading>
          <BodyText>
            Access to the full dataset requires an approved request. Approved
            access is non-transferable and subject to the terms communicated at
            the time of grant. Access may be revoked for misuse or inactivity.
          </BodyText>

          <TermsHeading>Attribution</TermsHeading>
          <BodyText>
            Research outputs using this dataset should cite the Fact Check
            Database and the original source organizations. Source attribution
            metadata is included in every record for this purpose.
          </BodyText>

          <TermsHeading>No Warranty</TermsHeading>
          <BodyText>
            The dataset is provided as-is. We make reasonable efforts to ensure
            accuracy and completeness but do not warrant that records are free
            of error or that ingestion is continuous without interruption.
            Verdicts reflect the position of the originating organization at
            time of publication, not an independent editorial determination by
            this platform.
          </BodyText>

          <TermsHeading>Changes</TermsHeading>
          <BodyText>
            These terms may be updated. Continued use after publication of
            changes constitutes acceptance of the revised terms. Material
            changes will be noted in the corrections log.
          </BodyText>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
