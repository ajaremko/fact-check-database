'use client'

import { useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import Link from 'next/link'

import { C, mono, serif } from '@/lib/theme'
import { TEXT_FADE_DELAY } from '@/lib/theme/motion'
import { BodyText, Container, SectionLabel } from '@/lib/layout'

import { FluidBackground } from './FluidBackground'
import { ScrollButton } from './ScrollButton'

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
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
  font-family: ${serif};
`

const InterludeSection = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
  background-color: ${C.bgBase};
  color: ${C.textPrimary};
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

const Section = styled.section`
  background-color: ${C.bgBase};
  padding: 5rem 0;
  font-family: ${serif};
`

const Heading2 = styled.h2`
  font-family: ${mono};
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 400;
  color: ${C.textPrimary};
  margin: 0 0 1rem;
  max-width: 640px;
`

const CtaBody = styled.p`
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 2rem;
  font-size: 1rem;
`

const CtaButton = styled(Link)`
  display: inline-block;
  background-color: ${C.textPrimary};
  color: ${C.bgBase};
  font-weight: 700;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }
`

export function Hero() {
  const nextSectionRef = useRef<HTMLDivElement>(null)

  const scrollToNextSection = () => {
    const headerOffset = 60
    const elementPosition = nextSectionRef.current?.getBoundingClientRect().top
    if (!elementPosition) return
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    })
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
            We create narrative analysis tools for newsrooms, nonprofits and
            academics that supercharge digital investigations and impact
            assessments.
          </Subheading>
        </Content>
        <ScrollButton
          $delay={subheadingDelay}
          $fadeIn={fadeIn}
          onClick={scrollToNextSection}
          aria-label="Scroll to learn more"
        />
      </HeroSection>
      <Section ref={nextSectionRef}>
        <Container>
          <SectionLabel>The Opportunity</SectionLabel>
          <Heading2>
            Tracking Narrative Change has Never Been More Challenging, or More
            Possible
          </Heading2>
          <BodyText>
            The boundary between journalist, citizen, and advertiser has
            dissolved. We can no longer expect the news to come in a single,
            reliable package; The news is now a fluid, heterogeneous,
            distributed, and unverified stream of information. This makes it
            difficult to separate subject from author, fact from fiction, and to
            identify sources of information.
          </BodyText>
          <BodyText>
            Quantitatively tracking the evolution of narratives across time and
            mediums is a complex task that requires sophisticated digital tools
            and methodologies. Researchers and analysts need to be able to
            collect, organize, and analyze vast amounts of data from diverse
            sources to understand how information spreads and transforms.
          </BodyText>
        </Container>
      </Section>
      {/* Analysis types: Structural (how), Thematic (what), Performative (who) */}
      <InterludeSection>
        <FluidBackground />
        <Content>
          <Heading2>The Shape of the News is Liquid</Heading2>
        </Content>
      </InterludeSection>
      <Section>
        <Container>
          <SectionLabel>Our Services</SectionLabel>
          <Heading2>
            Real-Time Narrative Tracking, Bespoke Dataset Creation and Data
            Warehousing
          </Heading2>
          <BodyText>
            We provide a platform that archives content from a wide range of
            digital sources, including social media, news websites, radio and
            television. Our platform uses advanced statistical techniques to
            extract meaningful datasets and knowledge graphs allowing you to
            assess the impact of your organization or others on public
            discourse.
          </BodyText>
        </Container>
      </Section>
      <StatsBar>
        <StatsInner>
          <StatItem>
            <StatValue>AI + ML</StatValue>
            <StatLabel>Data Enrichment</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>10,000+</StatValue>
            <StatLabel>Sources</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>Daily</StatValue>
            <StatLabel>Ingestion Cadence</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>51+</StatValue>
            <StatLabel>Languages</StatLabel>
          </StatItem>
        </StatsInner>
      </StatsBar>
      <Section>
        <Container>
          <SectionLabel>Our Platform</SectionLabel>
          <Heading2>
            Content Archival and Data Extraction Across Mediums and Languages
          </Heading2>
          <BodyText>
            We provide a platform that archives content from a wide range of
            digital sources, including social media, news websites, radio and
            television. Our platform uses advanced statistical techniques to
            extract meaningful datasets and knowledge graphs allowing you to
            assess the impact of your organization or others on public
            discourse.
          </BodyText>
        </Container>
      </Section>
      <InterludeSection>
        <FluidBackground />
        <Content>
          <Heading2>The Shape of the News is Liquid</Heading2>
        </Content>
      </InterludeSection>
      <Section>
        <Container>
          <Heading2>Bring Our Expertise to Your Organization</Heading2>
          <CtaBody>
            Placeholder copy — invite the reader to explore the services this
            platform offers.
          </CtaBody>
          <CtaButton href="/services">View Services</CtaButton>
        </Container>
      </Section>
    </PageWrapper>
  )
}
