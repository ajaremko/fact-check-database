'use client'

import Link from 'next/link'
import styled from 'styled-components'
import { C, bp } from '@/lib/theme'

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
  padding: 4rem 0;
`

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid ${C.borderSubtle};
  margin: 0;
`

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
  font-size: 1.5rem;
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

// --- Schema Table ---

const SchemaTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`

const Thead = styled.thead``

const Tbody = styled.tbody`
  tr:nth-child(even) td {
    background-color: ${C.bgSurface};
  }
`

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${C.borderSubtle};
  color: ${C.textMuted};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${C.borderSubtle};
  color: ${C.textSecondary};
  vertical-align: top;
`

const TdMono = styled(Td)`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  color: ${C.accent};
  font-size: 0.8rem;
  white-space: nowrap;
`

const TdType = styled(Td)`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  color: ${C.textMuted};
  font-size: 0.8rem;
  white-space: nowrap;
`

// --- Code Block ---

const CodeBlock = styled.pre`
  background-color: ${C.bgCode};
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 0.825rem;
  line-height: 1.7;
  padding: 1.75rem;
  border-radius: 6px;
  border: 1px solid ${C.borderSubtle};
  overflow-x: auto;
  white-space: pre;
  margin: 0;
`

// --- CTA ---

const CtaRow = styled.div`
  padding: 4rem 0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
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

interface SchemaField {
  field: string
  type: string
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

const SCHEMA_FIELDS: SchemaField[] = [
  { field: 'title', type: 'string', description: 'Headline or title of the fact-check article' },
  { field: 'claim', type: 'string', description: 'The specific claim being evaluated, when extractable from the feed' },
  { field: 'link', type: 'string', description: 'Canonical URL of the original fact-check article' },
  { field: 'verdict_raw', type: 'string', description: 'Original verdict label as published by the source organization' },
  { field: 'verdict_normalized', type: 'enum', description: 'Standardized verdict: true | false | misleading | unsupported | exaggerated' },
  { field: 'published_at_normalized', type: 'timestamp', description: 'Publication datetime normalized to UTC ISO 8601' },
  { field: 'source.name', type: 'string', description: 'Name of the fact-checking organization' },
  { field: 'source.url', type: 'string', description: 'Base URL of the source organization' },
  { field: 'language', type: 'string', description: "BCP-47 language code of the article (e.g., 'en', 'fr')" },
  { field: 'content_sha256', type: 'string', description: 'SHA-256 hash of canonical content for deduplication across ingestion runs' },
]

const SAMPLE_JSON = `{
  "title": "No, WHO did not declare a 'global health emergency' over a new mpox strain in January 2026",
  "claim": "The WHO declared a global health emergency over a new mpox strain in January 2026.",
  "link": "https://factcheck.afp.com/doc.afp.com.36UE3JE",
  "verdict_raw": "False",
  "verdict_normalized": "false",
  "published_at_normalized": "2026-01-14T09:22:00Z",
  "source": {
    "name": "AFP Fact Check",
    "url": "https://factcheck.afp.com"
  },
  "language": "en",
  "content_sha256": "a3f9c2d1e4b8765432fedcba9876543210abcdef0123456789abcdef01234567"
}`

// --- Page ---

export default function DocsPage() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Reference</SectionLabel>
          <PageTitle>Documentation</PageTitle>
          <BodyText>
            Dataset schema, source coverage, and example records.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      {/* Data Sources */}
      <Section>
        <Container>
          <SectionLabel>Coverage</SectionLabel>
          <SectionHeading>Data Sources</SectionHeading>
          <BodyText>
            Records are ingested daily from the RSS and Atom feeds of the following organizations.
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

      {/* Schema */}
      <Section>
        <Container>
          <SectionLabel>Structure</SectionLabel>
          <SectionHeading>Schema</SectionHeading>
          <BodyText>
            Each record in the BigQuery table corresponds to a single fact-check article. All content
            fields are nullable — individual feeds may not populate every attribute.
          </BodyText>
          <SchemaTable>
            <Thead>
              <tr>
                <Th>Field</Th>
                <Th>Type</Th>
                <Th>Description</Th>
              </tr>
            </Thead>
            <Tbody>
              {SCHEMA_FIELDS.map((f) => (
                <tr key={f.field}>
                  <TdMono>{f.field}</TdMono>
                  <TdType>{f.type}</TdType>
                  <Td>{f.description}</Td>
                </tr>
              ))}
            </Tbody>
          </SchemaTable>
        </Container>
      </Section>

      <SectionDivider />

      {/* Sample Record */}
      <Section>
        <Container>
          <SectionLabel>Example</SectionLabel>
          <SectionHeading>Sample Record</SectionHeading>
          <BodyText>
            A representative record as it appears in the dataset after normalization. Field values
            are drawn from a real AFP Fact Check article for illustrative purposes.
          </BodyText>
          <CodeBlock>{SAMPLE_JSON}</CodeBlock>
        </Container>
      </Section>

      <SectionDivider />

      <Container>
        <CtaRow>
          <CTAButton href="/contact">Request Access &rarr;</CTAButton>
        </CtaRow>
      </Container>

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
