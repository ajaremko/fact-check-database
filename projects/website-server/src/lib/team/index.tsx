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

const MemberCard = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
  padding: 2rem 2.5rem;
  margin-bottom: 1.5rem;
`

const MemberName = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 0 0 0.25rem;
`

const MemberRole = styled.p`
  font-size: 0.875rem;
  color: ${C.accent};
  font-weight: 500;
  margin: 0 0 1rem;
`

// --- Page ---

export function Team() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>About</SectionLabel>
          <PageTitle>The Team</PageTitle>
          <BodyText>
            The Fact Check Database is built and maintained by a small group of
            researchers and engineers committed to open, auditable
            infrastructure for information integrity work.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <MemberCard>
            <MemberName>Alfred Young</MemberName>
            <MemberRole>Founder &amp; Infrastructure Lead</MemberRole>
            <BodyText>
              Alfred designed and operates the data collection, normalization,
              and storage infrastructure. His background spans distributed
              systems, data governance, and applied research on media
              ecosystems.
            </BodyText>
          </MemberCard>

          <BodyText>
            This project is developed as a portfolio demonstration of
            production-grade research infrastructure. Collaboration inquiries
            from researchers and journalists are welcome via the{' '}
            <a href="/contact" style={{ color: C.accent }}>
              contact page
            </a>
            .
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
