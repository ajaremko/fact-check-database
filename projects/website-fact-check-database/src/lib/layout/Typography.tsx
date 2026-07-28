'use client'

import styled from 'styled-components'

import { C } from '@/lib/theme'

export const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${C.accent};
  margin: 0 0 0.75rem;
`

export const BodyText = styled.p`
  color: ${C.textSecondary};
  line-height: 1.8;
  margin: 0 0 1rem;
  font-size: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`
