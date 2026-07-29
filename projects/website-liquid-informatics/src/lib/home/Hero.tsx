'use client'

import styled from 'styled-components'

import { C, mono, serif } from '@/lib/theme'

import { FluidBackground } from './FluidBackground'

const HeroSection = styled.section`
  position: relative;
  overflow: hidden;
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

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
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
      <FluidBackground />
      <Content>
        <Heading>The News is Liquid</Heading>
        <Subheading>
          A content archival and data extraction platform for longitudinal media
          research.
        </Subheading>
      </Content>
    </HeroSection>
  )
}
