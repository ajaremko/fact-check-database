'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'
import { C, bp } from '@/lib/theme'

const Bar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: ${C.bgSurface};
  border-bottom: 1px solid ${C.borderSubtle};
`

const Inner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LogoLink = styled(Link)`
  text-decoration: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${C.textPrimary};

  span {
    color: ${C.accent};
  }
`

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  ${bp.md} {
    gap: 2rem;
  }
`

const NavLink = styled(Link)<{ $active: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  color: ${({ $active }) => ($active ? C.accent : C.textMuted)};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ $active }) => ($active ? C.accent : C.textSecondary)};
  }
`

const NAV_ITEMS = [
  { label: 'Dataset', href: '/' },
  { label: 'Documentation', href: '/docs' },
  { label: 'Contact', href: '/contact' },
] as const

export function Navbar() {
  const pathname = usePathname()

  return (
    <Bar>
      <Inner>
        <LogoLink href="/">
          Fact<span>Check</span>
        </LogoLink>
        <NavLinks>
          {NAV_ITEMS.map(({ label, href }) => (
            <NavLink key={href} href={href} $active={pathname === href}>
              {label}
            </NavLink>
          ))}
        </NavLinks>
      </Inner>
    </Bar>
  )
}
