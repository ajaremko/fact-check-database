'use client'

import { useRef } from 'react'
import styled, { keyframes } from 'styled-components'

import { C, mono, serif } from '@/lib/theme'
import { TEXT_FADE_DELAY } from '@/lib/theme/motion'

import { FluidBackground } from './FluidBackground'

export const PageWrapper = styled.div`
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
  min-height: 100vh;
  font-family: ${serif};
`

const HeroSection = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  margin-top: -60px;
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
  max-width: 560px;
  gap: 1rem;
`

const Heading = styled.h1`
  font-family: ${mono};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  margin: 0;
`

// --- Heading reveal animation ---
//
// Prefix words fade in one at a time, then the heading's final word slot
// flashes through a few candidate words before settling on the real one.
// Timing is derived from a few constants below rather than hardcoded per
// element, so retuning one constant keeps the whole sequence in sync.

const PREFIX_WORDS = ['The', 'Shape', 'of', 'the', 'News', 'is']
const CYCLE_WORDS = ['Static', 'Changing', 'Melting']
const FINAL_WORD = 'Liquid'

const WORD_STAGGER = 0.15 // seconds between each prefix word's fade-in start
const WORD_DURATION = 1.6 // seconds each prefix word takes to fade in
const FLASH_DURATION = 1.1 // seconds each cycling word is shown

const cycleStart =
  TEXT_FADE_DELAY + (PREFIX_WORDS.length - 1) * WORD_STAGGER + WORD_DURATION
const finalWordDelay = cycleStart + CYCLE_WORDS.length * FLASH_DURATION
const subheadingDelay = finalWordDelay + WORD_DURATION // seconds after final word fades in

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const flash = keyframes`
  0%,
  100% {
    opacity: 0;
  }
  15%,
  85% {
    opacity: 1;
  }
`

const HeadingWord = styled.span<{ $delay: number }>`
  display: inline-block;
  opacity: 0;
  animation: ${fadeIn} ${WORD_DURATION}s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

const CycleSlot = styled.span`
  position: relative;
  display: inline-block;
`

const FlashWord = styled.span<{ $delay: number }>`
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0;
  animation: ${flash} ${FLASH_DURATION}s ease-in-out forwards;
  animation-delay: ${({ $delay }) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`

const FinalWord = styled.span<{ $delay: number }>`
  display: inline-block;
  opacity: 0;
  animation: ${fadeIn} ${WORD_DURATION}s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

const Subheading = styled.p<{ $delay: number }>`
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
  opacity: 0;
  animation: ${fadeIn} 2.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

const ScrollButton = styled.button<{ $delay: number }>`
  position: absolute;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  box-shadow: 4px 4px 20px rgba(0, 0, 0, 0.3);
  color: ${C.textInverse};
  cursor: pointer;
  opacity: 0;
  animation: ${fadeIn} 2.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

// --- Stats Bar ---

const StatsBar = styled.div`
  background-color: ${C.bgSurface};
  border-top: 1px solid ${C.borderSubtle};
  border-bottom: 1px solid ${C.borderSubtle};
`

const StatsInner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-wrap: wrap;
`

const StatItem = styled.div`
  flex: 1 1 140px;
  padding: 1.5rem 1rem;
  text-align: center;
  border-right: 1px solid ${C.borderSubtle};

  &:last-child {
    border-right: none;
  }
`

const StatValue = styled.span`
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${C.accent};
  margin-bottom: 0.25rem;
`

const StatLabel = styled.span`
  display: block;
  font-size: 0.8rem;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export function Hero() {
  const nextSectionRef = useRef<HTMLDivElement>(null)

  const scrollToNextSection = () => {
    nextSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <PageWrapper>
      <HeroSection>
        <FluidBackground />
        <Content>
          <Heading>
            {PREFIX_WORDS.map((word, i) => (
              <span key={word + i}>
                <HeadingWord $delay={TEXT_FADE_DELAY + i * WORD_STAGGER}>
                  {word}
                </HeadingWord>
                {i === 3 ? <wbr /> : ' '}
              </span>
            ))}
            <CycleSlot>
              {CYCLE_WORDS.map((word, i) => (
                <FlashWord key={word} $delay={cycleStart + i * FLASH_DURATION}>
                  {word}
                </FlashWord>
              ))}
              <FinalWord $delay={finalWordDelay}>{FINAL_WORD}</FinalWord>
            </CycleSlot>
          </Heading>
          <Subheading $delay={subheadingDelay}>
            A content archival and data extraction platform for longitudinal
            media research and analysis.
          </Subheading>
        </Content>
        <ScrollButton
          $delay={subheadingDelay}
          onClick={scrollToNextSection}
          aria-label="Scroll to learn more"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </ScrollButton>
      </HeroSection>
      <StatsBar ref={nextSectionRef}>
        <StatsInner>
          <StatItem>
            <StatValue>10,000+</StatValue>
            <StatLabel>Sources</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>Daily</StatValue>
            <StatLabel>Ingestion Cadence</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>AI + ML</StatValue>
            <StatLabel>Data Enrichment</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>CMEK</StatValue>
            <StatLabel>Encrypted at Rest</StatLabel>
          </StatItem>
        </StatsInner>
      </StatsBar>
    </PageWrapper>
  )
}
