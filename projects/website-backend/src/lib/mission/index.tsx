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

const PrincipleHeading = styled.h2`
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 2rem 0 0.5rem;
`

// --- Page ---

export function Mission() {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Mission</SectionLabel>
          <PageTitle>Our Mission</PageTitle>
          <BodyText>
            We believe that rigorous, reproducible research on information
            integrity requires stable, auditable infrastructure — not ad hoc
            data exports. The Fact Check Database exists to provide exactly
            that.
          </BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <BodyText>
            Misinformation research is hampered by fragile data access: APIs
            change, exports expire, and institutional pipelines are rarely
            documented well enough to reproduce. We aim to fix that for the
            fact-check domain specifically.
          </BodyText>

          <PrincipleHeading>Openness</PrincipleHeading>
          <BodyText>
            Our methodology, ingestion pipeline, and schema are fully
            documented. Researchers can verify exactly how records are
            collected, normalized, and stored.
          </BodyText>

          <PrincipleHeading>Auditability</PrincipleHeading>
          <BodyText>
            Every record carries provenance metadata — source organization, raw
            claim URL, ingestion timestamp, and schema version. No silent
            mutations; corrections are tracked and published.
          </BodyText>

          <PrincipleHeading>Governance</PrincipleHeading>
          <BodyText>
            Access is controlled, logged, and revocable. Even though the
            underlying data is public, we apply the access disciplines of
            sensitive research infrastructure: least privilege, encryption at
            rest, and explicit data stewardship.
          </BodyText>

          <PrincipleHeading>Neutrality</PrincipleHeading>
          <BodyText>
            This platform does not rank, score, or editorialize. It collects
            and reproduces fact-check records as published by the source
            organizations. Any analytical judgments belong to downstream
            researchers, not this pipeline.
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
