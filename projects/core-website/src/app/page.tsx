'use client'

import Link from 'next/link'
import styled from 'styled-components'
import { C, bp, serif } from '@/lib/theme'

// --- Layout ---

const PageWrapper = styled.div`
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
  min-height: 100vh;
  font-family: ${serif};
`

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

const Section = styled.section`
  padding: 5rem 0;
`

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid ${C.borderSubtle};
  margin: 0;
`

// --- Typography ---

const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${C.accent};
  margin: 0 0 0.75rem;
`

const SectionHeading = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 0 0 1.5rem;
  line-height: 1.3;
`

const BodyText = styled.p`
  color: ${C.textSecondary};
  line-height: 1.8;
  margin: 0 0 1rem;
  font-size: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`

// --- Hero ---

const HeroSection = styled.section`
  padding: 7rem 0 5rem;
`

const HeroHeadline = styled.h1`
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 700;
  color: ${C.textPrimary};
  line-height: 1.15;
  margin: 0 0 1.5rem;
  max-width: 820px;
`

const HeroSubtitle = styled.p`
  font-size: 1.125rem;
  color: ${C.textSecondary};
  line-height: 1.75;
  margin: 0 0 2.5rem;
  max-width: 620px;
`

const CTAButton = styled(Link)`
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

const SecondaryLink = styled(Link)`
  display: inline-block;
  margin-left: 1.5rem;
  color: ${C.textSecondary};
  font-size: 0.95rem;
  text-decoration: none;
  border-bottom: 1px solid ${C.borderSubtle};
  padding-bottom: 1px;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: ${C.textPrimary};
    border-color: ${C.textSecondary};
  }
`

// --- Stats Bar ---

const StatsBar = styled.div`
  background-color: ${C.bgSurface};
  border-top: 1px solid ${C.borderSubtle};
  border-bottom: 1px solid ${C.borderSubtle};
`

const StatsInner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-wrap: wrap;
`

const StatItem = styled.div`
  flex: 1 1 140px;
  padding: 1.5rem 1rem;
  text-align: center;
  border-right: 1px solid ${C.borderSubtle};

  &:last-child {
    border-right: none;
  }
`

const StatValue = styled.span`
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${C.accent};
  margin-bottom: 0.25rem;
`

const StatLabel = styled.span`
  display: block;
  font-size: 0.8rem;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

// --- Sources ---

const SourceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  ${bp.md} {
    grid-template-columns: repeat(2, 1fr);
  }
`

const SourceCard = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
  padding: 1.25rem 1.5rem;
`

const SourceName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${C.textPrimary};
  margin: 0 0 0.5rem;
`

const SourceDesc = styled.p`
  font-size: 0.875rem;
  color: ${C.textSecondary};
  line-height: 1.65;
  margin: 0;
`

// --- Access Section ---

const AccessBox = styled.div`
  background-color: ${C.bgSurface};
  border-left: 3px solid ${C.accent};
  border-radius: 0 6px 6px 0;
  padding: 2rem 2.5rem;
`

const BulletList = styled.ul`
  color: ${C.textSecondary};
  line-height: 2;
  padding-left: 1.25rem;
  margin: 1rem 0 1.75rem;
`

const AccessCTA = styled(Link)`
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

// --- Static Data ---

interface SourceEntry {
  name: string
  description: string
}

const SOURCES: SourceEntry[] = [
  {
    name: 'PolitiFact',
    description:
      'U.S. political fact-checking from the Poynter Institute. Rates claims on a six-point "Truth-O-Meter" scale ranging from True to Pants on Fire.',
  },
  {
    name: 'Snopes',
    description:
      'One of the oldest fact-checking and rumor-debunking publications. Covers viral claims, urban legends, and political misinformation.',
  },
  {
    name: 'FactCheck.org',
    description:
      'Nonpartisan U.S. political fact-checking operated by the Annenberg Public Policy Center at the University of Pennsylvania.',
  },
  {
    name: 'LeadStories',
    description:
      'Focuses on viral misinformation trending on social media platforms. Uses a real-time trending story detection methodology.',
  },
  {
    name: 'Full Fact',
    description:
      'UK-based independent fact-checking charity. Covers claims from politicians, media outlets, and public discourse in the United Kingdom.',
  },
  {
    name: 'Africa Check',
    description:
      "Africa's first fact-checking organization, covering claims across sub-Saharan Africa in English, French, and Portuguese.",
  },
  {
    name: 'AFP Fact Check',
    description:
      'Global fact-checking unit of Agence France-Presse. Covers claims in multiple languages across Europe, Asia, Africa, and the Americas.',
  },
]

// --- Page ---

export default function Page() {
  return (
    <PageWrapper>
      {/* Hero */}
      <HeroSection>
        <Container>
          <HeroHeadline>
            A Research-Grade Fact-Check Dataset for the Open Web
          </HeroHeadline>
          <HeroSubtitle>
            Continuously updated from international fact-checking organizations.
            Structured, normalized, and secure — built for researchers and
            organizations studying our informational environment.
          </HeroSubtitle>
          <CTAButton href="/contact">Request Access</CTAButton>
          <SecondaryLink href="/docs">View Documentation &rarr;</SecondaryLink>
        </Container>
      </HeroSection>

      {/* Stats Bar */}
      <StatsBar>
        <StatsInner>
          <StatItem>
            <StatValue>7+</StatValue>
            <StatLabel>Sources</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>5</StatValue>
            <StatLabel>Verdict Categories</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>Daily</StatValue>
            <StatLabel>Ingestion Cadence</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>CMEK</StatValue>
            <StatLabel>Encrypted at Rest</StatLabel>
          </StatItem>
        </StatsInner>
      </StatsBar>

      {/* About */}
      <Section>
        <Container>
          <SectionLabel>Overview</SectionLabel>
          <SectionHeading>About the Dataset</SectionHeading>
          <BodyText>
            This dataset aggregates fact-check records published by leading
            international fact-checking organizations. Each record captures the
            original claim, the organization&apos;s verdict, a normalized
            verdict label, and publication metadata. New data is ingested daily
            through automated RSS feed parsing.
          </BodyText>
          <BodyText>
            The dataset is designed for researchers studying misinformation
            patterns, claim lifecycles, cross-source verdict consistency, and
            the temporal dynamics of false information. Records reflect the
            judgments of the source organizations and are preserved as-is to
            support comparative and longitudinal analysis.
          </BodyText>
          <BodyText>
            Coverage spans seven organizations across multiple geographies and
            languages, including English-language U.S. sources (PolitiFact,
            FactCheck.org, Snopes), a viral misinformation tracker
            (LeadStories), UK-based Full Fact, Africa Check covering sub-Saharan
            Africa, and AFP Fact Check with multilingual international reach.
          </BodyText>
        </Container>
      </Section>
      <SectionDivider />

      {/* Data Sources */}
      <Section>
        <Container>
          <SectionLabel>Coverage</SectionLabel>
          <SectionHeading>Data Sources</SectionHeading>
          <BodyText>
            Records are ingested daily from the RSS and Atom feeds of the
            following organizations.
          </BodyText>
          <SourceGrid>
            {SOURCES.map((s) => (
              <SourceCard key={s.name}>
                <SourceName>{s.name}</SourceName>
                <SourceDesc>{s.description}</SourceDesc>
              </SourceCard>
            ))}
          </SourceGrid>
        </Container>
      </Section>

      <SectionDivider />

      {/* Access */}
      <Section>
        <Container>
          <SectionLabel>Access</SectionLabel>
          <SectionHeading>Request Access</SectionHeading>
          <AccessBox>
            <BodyText>
              This dataset is available to academic researchers, journalists,
              and data scientists working on misinformation research,
              computational social science, or related fields. Access is granted
              on a case-by-case basis after a brief review of the intended use.
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
                Your preferred access method and any technical requirements or
                constraints
              </li>
            </BulletList>
            <AccessCTA href="/contact">Send Access Request &rarr;</AccessCTA>
          </AccessBox>
        </Container>
      </Section>

      {/* Footer */}
      <Footer>
        <Container>
          The Fact Check Database 2026, maintained by Alfred Young &middot;{' '}
          <FooterLink href="mailto:alfredsyoung@gmail.com">
            alfredsyoung@gmail.com
          </FooterLink>
        </Container>
      </Footer>
    </PageWrapper>
  )
}
