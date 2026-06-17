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

const AccessBox = styled.div`
  background-color: ${C.bgSurface};
  border-left: 3px solid ${C.accent};
  border-radius: 0 6px 6px 0;
  padding: 2rem 2.5rem;
  margin-bottom: 2rem;
`

const BulletList = styled.ul`
  color: ${C.textSecondary};
  line-height: 2;
  padding-left: 1.25rem;
  margin: 1rem 0 1.75rem;
`

const CTAButton = styled.a`
  display: inline-block;
  background-color: ${C.accent};
  color: ${C.bgBase};
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${C.accentHover};
  }
`

const ResponseNote = styled.div`
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
`

const ResponseNoteText = styled.p`
  color: ${C.textMuted};
  font-size: 0.875rem;
  line-height: 1.7;
  margin: 0;
`

// --- Page ---

export function RequestAccess() {
  const mailtoHref =
    'mailto:alfredsyoung@gmail.com' +
    '?subject=Dataset%20Access%20Request' +
    '&body=Name%3A%0AInstitutional%20affiliation%3A%0AProject%20description%3A%0AData%20needs%3A'

  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Get Access</SectionLabel>
          <PageTitle>Request Dataset Access</PageTitle>
          <BodyText>
            Access is granted on a case-by-case basis to researchers,
            journalists, and data scientists working on misinformation research
            or related fields.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <AccessBox>
            <BodyText>
              This dataset is available to academic researchers, journalists,
              and data scientists working on misinformation research,
              computational social science, or related fields.
            </BodyText>
            <BodyText>Please include the following in your request:</BodyText>
            <BulletList>
              <li>
                Your name and institutional affiliation, or independent
                researcher status
              </li>
              <li>
                A brief description of your research project or intended use
                case
              </li>
              <li>The approximate data volume you expect to query</li>
              <li>
                Whether you require BigQuery direct access, GCS export, or both
              </li>
            </BulletList>
            <CTAButton href={mailtoHref}>
              Send Access Request &rarr; alfredsyoung@gmail.com
            </CTAButton>
          </AccessBox>

          <ResponseNote>
            <ResponseNoteText>
              Requests are typically reviewed within 5 business days.
              You&apos;ll receive a follow-up to discuss your project and
              confirm your access level.
            </ResponseNoteText>
          </ResponseNote>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
