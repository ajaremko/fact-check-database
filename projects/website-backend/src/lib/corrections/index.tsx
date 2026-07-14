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

const PolicyHeading = styled.h2`
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 2rem 0 0.5rem;
`

const EmptyState = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
  padding: 2rem 2.5rem;
  text-align: center;
  color: ${C.textMuted};
  font-size: 0.9375rem;
  margin-top: 2rem;
`

// --- Page ---

export function Corrections() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Transparency</SectionLabel>
          <PageTitle>Corrections Policy</PageTitle>
          <BodyText>
            We are committed to accuracy in our data collection and
            documentation. When errors are identified, we correct them promptly
            and maintain a public log of changes.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <PolicyHeading>What We Correct</PolicyHeading>
          <BodyText>
            Corrections apply to errors in our own documentation, metadata, or
            infrastructure descriptions. We do not modify or correct the
            records of source fact-checking organizations — those records are
            reproduced as published. If a source organization has issued a
            correction to one of their records, that will be reflected at the
            next ingestion cycle.
          </BodyText>

          <PolicyHeading>How to Report an Error</PolicyHeading>
          <BodyText>
            If you believe a record is mislabeled, a schema field is incorrect,
            or our documentation misrepresents the system, please email{' '}
            <a href="mailto:alfredsyoung@gmail.com" style={{ color: C.accent }}>
              alfredsyoung@gmail.com
            </a>{' '}
            with the subject line &ldquo;Correction:&rdquo; followed by a brief
            description of the issue.
          </BodyText>

          <PolicyHeading>Corrections Log</PolicyHeading>
          <EmptyState>No corrections have been logged to date.</EmptyState>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
