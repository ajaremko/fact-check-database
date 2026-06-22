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

export function ContactLayout(props: PropsWithChildren) {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>Contact</SectionLabel>
          <PageTitle>Get in Touch</PageTitle>
          <BodyText>
            Use the form below to reach us. For dataset access requests or tip
            submissions, dedicated forms are also available.
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
