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

const TopicGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`

const TopicCard = styled.a`
  display: block;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
  padding: 1.5rem 2rem;
  text-decoration: none;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${C.accent};
  }
`

const TopicLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${C.accent};
  margin: 0 0 0.375rem;
`

const TopicTitle = styled.p`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${C.textPrimary};
  margin: 0 0 0.375rem;
`

const TopicDesc = styled.p`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  line-height: 1.6;
  margin: 0;
`

const DirectContact = styled.div`
  margin-top: 1rem;
  padding: 1.25rem 1.5rem;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
`

const DirectContactText = styled.p`
  color: ${C.textMuted};
  font-size: 0.875rem;
  line-height: 1.7;
  margin: 0;
`

const InlineLink = styled.a`
  color: ${C.accent};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

// --- Page ---

const TOPICS = [
  {
    label: 'Research',
    title: 'Dataset Access',
    desc: 'Request access to the full dataset for academic or journalistic research.',
    href:
      'mailto:alfredsyoung@gmail.com' +
      '?subject=Dataset%20Access%20Request' +
      '&body=Name%3A%0AInstitutional%20affiliation%3A%0AProject%20description%3A%0AData%20needs%3A',
  },
  {
    label: 'Press',
    title: 'Media Inquiry',
    desc: 'Questions about the platform for editorial or media coverage.',
    href:
      'mailto:alfredsyoung@gmail.com' +
      '?subject=Media%20Inquiry',
  },
  {
    label: 'Contribute',
    title: 'Submit a Tip',
    desc: 'Know a fact-checking organization we should be ingesting? Let us know.',
    href: '/dataset/submissions',
  },
  {
    label: 'General',
    title: 'Everything Else',
    desc: 'Feedback, corrections, collaboration ideas, or anything else.',
    href:
      'mailto:alfredsyoung@gmail.com' +
      '?subject=General%20Inquiry',
  },
] as const

export function Contact() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Contact</SectionLabel>
          <PageTitle>Get in Touch</PageTitle>
          <BodyText>
            Choose the topic that best fits your inquiry and we&apos;ll make
            sure it reaches the right place.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <TopicGrid>
            {TOPICS.map(({ label, title, desc, href }) => (
              <TopicCard key={title} href={href}>
                <TopicLabel>{label}</TopicLabel>
                <TopicTitle>{title}</TopicTitle>
                <TopicDesc>{desc}</TopicDesc>
              </TopicCard>
            ))}
          </TopicGrid>

          <DirectContact>
            <DirectContactText>
              Prefer to write directly?{' '}
              <InlineLink href="mailto:alfredsyoung@gmail.com">
                alfredsyoung@gmail.com
              </InlineLink>
            </DirectContactText>
          </DirectContact>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
