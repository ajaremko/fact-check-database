'use client'

import Link from 'next/link'
import styled from 'styled-components'

import { C, bp } from '@/lib/theme'

const FooterNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.5rem;
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid ${C.borderSubtle};

  ${bp.md} {
    gap: 0.5rem 2rem;
  }
`

const FooterNavLink = styled(Link)`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover {
    color: ${C.textSecondary};
  }
`

const NAV_ITEMS = [
  { label: 'Team', href: '/team' },
  { label: 'Mission', href: '/mission' },
  { label: 'Submissions', href: '/submissions' },
  { label: 'Corrections', href: '/corrections' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
] as const

export function NavFooter() {
  return (
    <FooterNav>
      {NAV_ITEMS.map(({ label, href }) => (
        <FooterNavLink key={href} href={href}>
          {label}
        </FooterNavLink>
      ))}
    </FooterNav>
  )
}
