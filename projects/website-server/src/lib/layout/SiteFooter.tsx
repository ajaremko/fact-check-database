'use client'

import styled from 'styled-components'

import { C } from '@/lib/theme'

import { Container } from './Container'

export const SiteFooter = styled.footer`
  background-color: ${C.bgSurface};
  border-top: 1px solid ${C.borderSubtle};
  padding: 2rem 0;
  text-align: center;
  color: ${C.textMuted};
  font-size: 0.85rem;
`

export const FooterLink = styled.a`
  color: ${C.textMuted};
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: ${C.textSecondary};
  }
`

export function SiteFooterMeta() {
  return (
    <Container>
      The Fact Check Database 2026
      <br />
      Build #{process.env.NEXT_PUBLIC_BUILD_NUMBER}
      <br />
      <span>Created and maintained by Alfred Young &middot; </span>
      <FooterLink href="mailto:alfredsyoung@gmail.com">
        alfredsyoung@gmail.com
      </FooterLink>
    </Container>
  )
}
