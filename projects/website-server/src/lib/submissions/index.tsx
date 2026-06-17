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

const InfoBox = styled.div`
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

const Note = styled.div`
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
`

const NoteText = styled.p`
  color: ${C.textMuted};
  font-size: 0.875rem;
  line-height: 1.7;
  margin: 0;
`

// --- Page ---

export function Submissions() {
  const mailtoHref =
    'mailto:alfredsyoung@gmail.com' +
    '?subject=Tip%20Submission' +
    '&body=Claim%20or%20source%3A%0AOrganization%20that%20fact-checked%20it%3A%0ALink%20to%20the%20fact-check%3A%0AAdditional%20context%3A'

  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Contribute</SectionLabel>
          <PageTitle>Submit a Tip</PageTitle>
          <BodyText>
            Know of a fact-checking organization or published fact-check that
            should be in this database? Let us know. We review all submissions
            and prioritize sources that publish structured, machine-readable data.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <InfoBox>
            <BodyText>
              Submissions are most useful when they include a direct link to the
              fact-check or source organization. Please include the following in
              your email:
            </BodyText>
            <BulletList>
              <li>The claim or article being fact-checked</li>
              <li>The organization that published the fact-check</li>
              <li>A direct URL to the fact-check</li>
              <li>Any relevant context about why this source is valuable</li>
            </BulletList>
            <CTAButton href={mailtoHref}>Submit a Tip &rarr;</CTAButton>
          </InfoBox>

          <Note>
            <NoteText>
              We cannot guarantee that all submitted sources will be added to the
              pipeline. Sources must publish structured or semi-structured data
              and meet baseline editorial standards. We will follow up if your
              submission leads to a new integration.
            </NoteText>
          </Note>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
