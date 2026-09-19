'use client'

import styled from 'styled-components'
import { PropsWithChildren } from 'react'

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

// --- Page ---

export function AccessLayout(props: PropsWithChildren) {
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
        <Container>{props.children}</Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
