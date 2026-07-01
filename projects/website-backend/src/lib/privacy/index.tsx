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

const LastUpdated = styled.p`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  margin: 0 0 2rem;
`

// --- Page ---

export function Privacy() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Legal</SectionLabel>
          <PageTitle>Privacy Policy</PageTitle>
          <BodyText>
            This policy describes what information we collect, how we use it,
            and what rights you have with respect to your data.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <LastUpdated>Last updated: June 2026</LastUpdated>

          <PolicyHeading>What We Collect</PolicyHeading>
          <BodyText>
            This site does not require account registration. When you use the
            search interface, queries are transmitted to Algolia to return
            results. Standard server and CDN access logs may record your IP
            address and user agent for operational purposes. We do not use
            tracking pixels, behavioral advertising, or third-party analytics
            beyond search functionality.
          </BodyText>

          <PolicyHeading>Dataset Access Requests</PolicyHeading>
          <BodyText>
            If you contact us to request dataset access, we collect the
            information you include in your email (name, affiliation, project
            description). This information is used solely to evaluate and
            fulfill your request. It is not shared with third parties.
          </BodyText>

          <PolicyHeading>Cookies</PolicyHeading>
          <BodyText>
            We do not set cookies for advertising or cross-site tracking. Search
            functionality may use session storage to preserve query state. No
            persistent identifiers are set without explicit user action.
          </BodyText>

          <PolicyHeading>Data Retention</PolicyHeading>
          <BodyText>
            Access logs are retained for up to 90 days for operational
            troubleshooting and then deleted. Access request correspondence is
            retained for the duration of any active research collaboration and
            deleted upon request.
          </BodyText>

          <PolicyHeading>Contact</PolicyHeading>
          <BodyText>
            For privacy-related inquiries, email{' '}
            <a href="mailto:alfredsyoung@gmail.com" style={{ color: C.accent }}>
              alfredsyoung@gmail.com
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
