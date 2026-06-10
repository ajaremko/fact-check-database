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
import { C, bp, serif } from '@/lib/theme'

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
  margin: 0;
  max-width: 620px;
`

// --- Sections ---

const Section = styled.section`
  padding: 5rem 0;
`

const SectionHeading = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 0 0 1.5rem;
  line-height: 1.3;
`

// --- Pipeline Steps ---

const StepList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 2rem 0 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  ${bp.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StepItem = styled.li`
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
  padding: 1.5rem;
`

const StepNumber = styled.span`
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: ${C.accent};
  color: ${C.bgBase};
  font-family: ${serif};
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StepContent = styled.div``

const StepTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${C.textPrimary};
  margin: 0 0 0.375rem;
`

const StepDesc = styled.p`
  font-size: 0.875rem;
  color: ${C.textSecondary};
  line-height: 1.65;
  margin: 0;
`

// --- Sources ---

const SourceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 2rem;

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
  margin: 0 0 0.375rem;
`

const SourceMeta = styled.p`
  font-size: 0.8rem;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.5rem;
`

const SourceDesc = styled.p`
  font-size: 0.875rem;
  color: ${C.textSecondary};
  line-height: 1.65;
  margin: 0;
`

// --- Policy Gates ---

const GateList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const GateItem = styled.li`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 6px;
`

const GateLabel = styled.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${C.accent};
  padding-top: 0.1rem;
  min-width: 5rem;
`

const GateDesc = styled.p`
  font-size: 0.9rem;
  color: ${C.textSecondary};
  line-height: 1.65;
  margin: 0;
`

// --- Verdict Vocabulary ---

const VerdictRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
`

const VerdictChip = styled.span`
  display: inline-block;
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-radius: 4px;
  padding: 0.4rem 0.875rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${C.accent};
  letter-spacing: 0.04em;
`

// --- Static data ---

interface SourceEntry {
  name: string
  feedType: string
  description: string
}

const SOURCES: SourceEntry[] = [
  {
    name: 'PolitiFact',
    feedType: 'RSS',
    description:
      'U.S. political fact-checking from the Poynter Institute. Covers claims by politicians and public figures on a six-point rating scale.',
  },
  {
    name: 'Snopes',
    feedType: 'RSS',
    description:
      'One of the oldest fact-checking publications. Covers viral claims, urban legends, and political misinformation across multiple countries.',
  },
  {
    name: 'FactCheck.org',
    feedType: 'RSS',
    description:
      'Nonpartisan political fact-checking from the Annenberg Public Policy Center. Focuses on U.S. federal and state politics.',
  },
  {
    name: 'Lead Stories',
    feedType: 'RSS',
    description:
      'Real-time fact-checking of viral misinformation using the Trendolizer platform. Covers health, politics, and social media hoaxes.',
  },
  {
    name: 'Full Fact',
    feedType: 'RSS',
    description:
      'Independent fact-checking charity based in the UK. Covers claims in British politics, health, and public discourse.',
  },
  {
    name: 'Africa Check',
    feedType: 'Atom',
    description:
      'Africa-focused fact-checking organization operating across multiple countries. Covers political claims, health misinformation, and social media content.',
  },
  {
    name: 'AFP Fact Check',
    feedType: 'RSS',
    description:
      'Global fact-checking desk operated by Agence France-Presse. Covers viral and misleading content in multiple languages worldwide.',
  },
]

const POLICY_GATES = [
  {
    label: 'Gate 1',
    description:
      'Fetch result — if the HTTP request failed (network error, timeout, DNS failure), the observation is immediately quarantined as QUARANTINED_FETCH_FAILED. No body content is available for further evaluation.',
  },
  {
    label: 'Gate 2',
    description:
      "Body size — if the response body exceeds the configured maxBytes limit for the source's collection type, the observation is quarantined as QUARANTINED_TOO_LARGE. This prevents oversized or malformed responses from entering extraction.",
  },
  {
    label: 'Gate 3',
    description:
      'Content-Type — if an allowlist is configured for the collection type, the response Content-Type must match one of the allowed substrings. Missing or unexpected Content-Type values result in QUARANTINED_UNEXPECTED_CONTENT_TYPE.',
  },
  {
    label: 'Pass',
    description:
      'Observations that pass all gates are assigned the default access label for their collection — typically SAFE_PUBLIC for public RSS/Atom feeds. Per-source override rules can assign a different label or quarantine specific sources.',
  },
]

const VERDICT_VOCABULARY = [
  'true',
  'false',
  'misleading',
  'unsupported',
  'exaggerated',
]

// --- Component ---

export function Methodology() {
  return (
    <PageWrapper>
      <HeroSection>
        <Container>
          <HeroHeadline>Data Collection Methodology</HeroHeadline>
          <HeroSubtitle>
            An overview of how fact-check records are sourced, validated,
            structured, and archived — from RSS feed to queryable dataset.
          </HeroSubtitle>
        </Container>
      </HeroSection>

      <SectionDivider />

      {/* Data Sources */}
      <Section>
        <Container>
          <SectionLabel>Sources</SectionLabel>
          <SectionHeading>Monitored Feeds</SectionHeading>
          <BodyText>
            The pipeline monitors internationally recognized fact-checking
            organizations. Content is fetched on scheduled intervals. To view a
            complete list of sources and their collection types, see the table
            below.
          </BodyText>
          <SourceGrid>
            {SOURCES.map(({ name, feedType, description }) => (
              <SourceCard key={name}>
                <SourceName>{name}</SourceName>
                <SourceMeta>{feedType} feed</SourceMeta>
                <SourceDesc>{description}</SourceDesc>
              </SourceCard>
            ))}
          </SourceGrid>
        </Container>
      </Section>

      <SectionDivider />

      {/* Pipeline */}
      <Section>
        <Container>
          <SectionLabel>Infrastructure</SectionLabel>
          <SectionHeading>Three-Stage Ingestion Pipeline</SectionHeading>
          <BodyText>
            The pipeline runs as a sequence of three independent stages with
            each stage producing a structured audit record regardless of
            outcome. Stages are designed to be deterministic and independently
            replayable so that archived content can be reliably reprocessed to
            extract new or updated information.
          </BodyText>
          <StepList>
            <StepItem>
              <StepNumber>1</StepNumber>
              <StepContent>
                <StepTitle>Collection</StepTitle>
                <StepDesc>
                  Fetch raw feed content and archive to durable storage. SHA-256
                  content hash serves as a deterministic lineage identifier.
                </StepDesc>
              </StepContent>
            </StepItem>
            <StepItem>
              <StepNumber>2</StepNumber>
              <StepContent>
                <StepTitle>Sanitization</StepTitle>
                <StepDesc>
                  Apply an access-control policy to classify the safety of each
                  content item. Policy decisions are recorded in an audit action
                  list.
                </StepDesc>
              </StepContent>
            </StepItem>
            <StepItem>
              <StepNumber>3</StepNumber>
              <StepContent>
                <StepTitle>Extraction</StepTitle>
                <StepDesc>
                  Parse feed entries from safe content, extract and normalize
                  select fields and write structured data to temporary loading
                  storage.
                </StepDesc>
              </StepContent>
            </StepItem>
          </StepList>
        </Container>
      </Section>

      <SectionDivider />

      {/* Data Governance */}
      <Section>
        <Container>
          <SectionLabel>Governance</SectionLabel>
          <SectionHeading>Data Integrity &amp; Auditability</SectionHeading>
          <BodyText>
            All requests for content — successful or failed, passing or
            quarantined — are archived for auditing purposes. No original
            content is overwritten.
          </BodyText>
          <BodyText>
            We derive a deterministic <code>content_lineage_id</code> from
            collected content. Re-ingesting duplicate content at a later time
            produces the same identifier, enabling idempotent re-runs and
            exact-match deduplication. Because all policy decisions are recorded
            as ordered action lists in archived records, the full history of how
            any observation was classified is queryable and reproducible.
            Quarantined content is retained for manual review rather than
            discarded.
          </BodyText>
          <BodyText>
            To protect the integrity of the data we collect, the fact check
            database encrypts archive data at rest and applies least-privilege
            access patterns throughout our technology.
          </BodyText>
        </Container>
      </Section>

      <SiteFooter>
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
