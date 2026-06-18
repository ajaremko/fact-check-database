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

import { SubmissionsForm } from './SubmissionsForm'

// --- Page Header ---

const PageHeader = styled.header`
  padding: 5rem 0 3rem;
`

const PageTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 1rem;
`

// --- Content ---

const ContentSection = styled.section`
  padding: 4rem 0;
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
          <SubmissionsForm />

          <Note>
            <NoteText>
              We cannot guarantee that all submitted sources will be added to
              the pipeline. Sources must publish structured or semi-structured
              data and meet baseline editorial standards. We will follow up if
              your submission leads to a new integration.
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
