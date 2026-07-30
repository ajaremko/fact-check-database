'use client'

import styled, { keyframes } from 'styled-components'

import { PAGE_FADE_DELAY, PAGE_FADE_DURATION } from './motion'

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

export const PageFadeIn = styled.div`
  opacity: 0;
  animation: ${fadeIn} ${PAGE_FADE_DURATION}s ease forwards;
  animation-delay: ${PAGE_FADE_DELAY}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`
