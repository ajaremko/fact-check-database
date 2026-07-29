'use client'

import styled from 'styled-components'

import { C, mono, serif } from '@/lib/theme'

const HeroSection = styled.section`
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
  background-color: ${C.bgDark};
  color: ${C.textInverse};
  font-family: ${serif};
`

const Heading = styled.h1`
  font-family: ${mono};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  margin: 0;
`

const Subheading = styled.p`
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
`

export function Hero() {
  return (
    <HeroSection>
      <Heading>Liquid Informatics</Heading>
      <Subheading>
        Bespoke data collection and extraction for media researchers,
        journalists, and academics.
      </Subheading>
    </HeroSection>
  )
}
