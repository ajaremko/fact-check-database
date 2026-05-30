'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { C } from '@/lib/theme'

// --- Layout ---

const PageWrapper = styled.div`
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
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
  color: #0f172a;
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

// --- Governance ---

const GovernanceList = styled.dl`
  margin: 0;
`

const GovernanceTerm = styled.dt`
  font-size: 1rem;
  font-weight: 600;
  color: ${C.textPrimary};
  margin: 0 0 0.35rem;
`

const GovernanceDetail = styled.dd`
  color: ${C.textSecondary};
  line-height: 1.8;
  margin: 0 0 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const InlineCode = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 0.85em;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 3px;
  padding: 0.1em 0.4em;
  color: ${C.textPrimary};
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
  color: #0f172a;
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

interface GovernanceItem {
  term: string
  detail: ReactNode
}

// --- Page ---

export default function Page() {
  const GOVERNANCE_ITEMS: GovernanceItem[] = [
    {
      term: 'Encryption at Rest',
      detail: (
        <>
          All records are encrypted at rest using Google Cloud KMS with
          customer-managed encryption keys (CMEK). Key management is scoped to
          the dataset owner&apos;s GCP project and is not delegated to any third
          party.
        </>
      ),
    },
    {
      term: 'Append-Only Archive',
      detail:
        'The dataset uses an append-only write pattern with a full audit trail. Records are never modified or deleted — corrections are represented as new records with updated normalized fields alongside the original.',
    },
    {
      term: 'Access Policy Labels',
      detail: (
        <>
          Each record carries a policy label:{' '}
          <InlineCode>SAFE_PUBLIC</InlineCode> for fully processed records,{' '}
          <InlineCode>RESTRICTED</InlineCode> for records pending manual review,
          and <InlineCode>QUARANTINED</InlineCode> for records flagged by
          automated quality checks. Shared dataset views surface only{' '}
          <InlineCode>SAFE_PUBLIC</InlineCode> records.
        </>
      ),
    },
    {
      term: 'Storage and Access Control',
      detail:
        'Data is stored in Google BigQuery and mirrored to Google Cloud Storage in newline-delimited JSON format. Access is controlled via GCP IAM roles granted per researcher after review.',
    },
  ]

  return (
    <PageWrapper>
      {/* Hero */}
      <HeroSection>
        <Container>
          <SectionLabel>Research Dataset</SectionLabel>
          <HeroHeadline>
            A Research-Grade Fact-Check Dataset for the Open Web
          </HeroHeadline>
          <HeroSubtitle>
            Continuously updated from 7 international fact-checking
            organizations. Structured, normalized, and encrypted at rest —
            built for researchers studying misinformation, not for moderation
            pipelines.
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
            original claim, the organization&apos;s verdict, a normalized verdict
            label, publication metadata, and a content hash for deduplication.
            Ingestion runs daily via automated RSS and Atom feed parsing, with
            each record archived in its original form alongside normalized
            fields.
          </BodyText>
          <BodyText>
            The dataset is designed for researchers studying misinformation
            patterns, claim lifecycles, cross-source verdict consistency, and the
            temporal dynamics of false information. It is not intended as a
            moderation tool or real-time decision system. Records reflect the
            judgments of the source organizations and are preserved as-is to
            support comparative and longitudinal analysis.
          </BodyText>
          <BodyText>
            Coverage spans seven organizations across multiple geographies and
            languages, including English-language U.S. sources (PolitiFact,
            FactCheck.org, Snopes), a viral misinformation tracker (LeadStories),
            UK-based Full Fact, Africa Check covering sub-Saharan Africa, and AFP
            Fact Check with multilingual international reach.
          </BodyText>
        </Container>
      </Section>

      <SectionDivider />

      {/* Governance */}
      <Section>
        <Container>
          <SectionLabel>Security &amp; Compliance</SectionLabel>
          <SectionHeading>Data Governance</SectionHeading>
          <GovernanceList>
            {GOVERNANCE_ITEMS.map((item) => (
              <div key={item.term}>
                <GovernanceTerm>{item.term}</GovernanceTerm>
                <GovernanceDetail>{item.detail}</GovernanceDetail>
              </div>
            ))}
          </GovernanceList>
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
              This dataset is available to academic researchers, journalists, and
              data scientists working on misinformation research, computational
              social science, or related fields. Access is granted on a
              case-by-case basis after a brief review of the intended use.
            </BodyText>
            <BodyText>Please include the following in your request:</BodyText>
            <BulletList>
              <li>
                Your name and institutional affiliation, or independent
                researcher status
              </li>
              <li>
                A brief description of your research project or intended use case
              </li>
              <li>The approximate data volume you expect to query</li>
              <li>
                Whether you require BigQuery direct access, GCS export, or both
              </li>
            </BulletList>
            <AccessCTA href="/contact">
              Send Access Request &rarr;
            </AccessCTA>
          </AccessBox>
        </Container>
      </Section>

      {/* Footer */}
      <Footer>
        <Container>
          Dataset maintained by Alfred Young &middot;{' '}
          <FooterLink href="mailto:alfredsyoung@gmail.com">
            alfredsyoung@gmail.com
          </FooterLink>
        </Container>
      </Footer>
    </PageWrapper>
  )
}
