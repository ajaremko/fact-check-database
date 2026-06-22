'use client'

import Link from 'next/link'
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

interface Props {
  sectionLabel: string
  title: string
  message: string
  returnHref: string
  returnLabel: string
}

const PageHeader = styled.header`
  padding: 5rem 0 3rem;
`

const PageTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 1rem;
`

const ContentSection = styled.section`
  padding: 4rem 0;
`

const ReturnLink = styled(Link)`
  font-size: 0.9375rem;
  color: ${C.accent};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`

export function FormSuccessPage({
  sectionLabel,
  title,
  message,
  returnHref,
  returnLabel,
}: Props) {
  return (
    <PageWrapper>
      <PageHeader>
        <Container>
          <SectionLabel>{sectionLabel}</SectionLabel>
          <PageTitle>{title}</PageTitle>
          <BodyText>{message}</BodyText>
        </Container>
      </PageHeader>

      <SectionDivider />

      <ContentSection>
        <Container>
          <ReturnLink href={returnHref}>← {returnLabel}</ReturnLink>
        </Container>
      </ContentSection>

      <SiteFooter>
        <NavFooter />
        <SiteFooterMeta />
      </SiteFooter>
    </PageWrapper>
  )
}
