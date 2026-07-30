'use client'

import styled from 'styled-components'

import { BodyText, Container, SectionLabel } from '@/lib/layout'
import { C, serif } from '@/lib/theme'

const Section = styled.section`
  background-color: ${C.bgSurface};
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

export function SolutionSection() {
  return (
    <Section>
      <Container>
        <SectionLabel>Our Solution</SectionLabel>
        <Heading2>Placeholder: how the platform solves it</Heading2>
        <BodyText>
          Placeholder copy — describe what the platform does and why it's the
          right way to solve the problem above.
        </BodyText>
      </Container>
    </Section>
  )
}
