'use client'

import styled from 'styled-components'

import { C, serif } from '@/lib/theme'

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
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
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
      <Heading>Your headline goes here</Heading>
      <Subheading>Placeholder subheading text.</Subheading>
    </HeroSection>
  )
}
