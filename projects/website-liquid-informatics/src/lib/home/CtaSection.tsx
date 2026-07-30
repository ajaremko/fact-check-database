'use client'

import Link from 'next/link'
import styled from 'styled-components'

import { Container } from '@/lib/layout'
import { C, serif } from '@/lib/theme'

const Section = styled.section`
  background-color: ${C.bgDark};
  color: ${C.textInverse};
  padding: 5rem 0;
  text-align: center;
  font-family: ${serif};
`

const Heading2 = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  margin: 0 0 1rem;
`

const CtaBody = styled.p`
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 2rem;
  font-size: 1rem;
`

const CtaButton = styled(Link)`
  display: inline-block;
  background-color: ${C.textInverse};
  color: ${C.bgDark};
  font-weight: 700;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }
`

export function CtaSection() {
  return (
    <Section>
      <Container>
        <Heading2>Placeholder: see how it works</Heading2>
        <CtaBody>
          Placeholder copy — invite the reader to explore the services this
          platform offers.
        </CtaBody>
        <CtaButton href="/services">View Services</CtaButton>
      </Container>
    </Section>
  )
}
