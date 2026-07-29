'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'

import { C, bp, serif } from '@/lib/theme'

const Bar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: ${serif};
`

const Inner = styled.div`
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LogoLink = styled(Link)`
  text-decoration: none;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${C.textInverse};
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
  color: ${({ $active }) => ($active ? C.textInverse : 'rgba(255, 255, 255, 0.7)')};
  transition: color 0.15s ease;

  &:hover {
    color: ${C.textInverse};
  }
`

const NAV_ITEMS = [
  { label: 'Dataset', href: '/dataset' },
  { label: 'Contact', href: '/contact' },
] as const

export function Navbar() {
  const pathname = usePathname()

  return (
    <Bar>
      <Inner>
        <LogoLink href="/">Liquid Informatics</LogoLink>
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
