'use client'

import styled from 'styled-components'

import { BodyText, Container, SectionLabel } from '@/lib/layout'
import { C, serif } from '@/lib/theme'

const Section = styled.section`
  background-color: ${C.bgBase};
  padding: 5rem 0;
  font-family: ${serif};
`

const Heading2 = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 0 0 1rem;
  max-width: 640px;
`

export function ProblemSection() {
  return (
    <Section>
      <Container>
        <SectionLabel>The Problem</SectionLabel>
        <Heading2>Placeholder: the core problem your customers face</Heading2>
        <BodyText>
          Placeholder copy — briefly describe the problem your customers face
          today and what it costs them if it goes unsolved.
        </BodyText>
      </Container>
    </Section>
  )
}
