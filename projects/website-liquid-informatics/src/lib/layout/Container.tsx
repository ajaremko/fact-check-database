'use client'

import styled from 'styled-components'

export const Container = styled.div<{ $maxWidth?: string }>`
  max-width: ${({ $maxWidth }) => $maxWidth ?? '900px'};
  margin: 0 auto;
  padding: 0 1.5rem;
`
