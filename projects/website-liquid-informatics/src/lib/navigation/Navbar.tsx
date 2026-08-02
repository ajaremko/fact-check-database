'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'

import { C, bp, mono } from '@/lib/theme'

const Bar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: ${mono};
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  box-shadow: 4px 4px 20px rgba(0, 0, 0, 0.3);
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
  font-weight: 400;
  letter-spacing: 0.01em;
  color: ${C.textPrimary};
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
  font-weight: 400;
  text-decoration: none;
  color: ${({ $active }) =>
    $active ? C.textPrimary : 'rgba(255, 255, 255, 0.7)'};
  transition: color 0.15s ease;

  &:hover {
    color: ${C.textPrimary};
  }
`

const NAV_ITEMS = [
  { label: 'Services', href: '/services' },
  { label: 'Datasets', href: '/datasets' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

export function Navbar() {
  const pathname = usePathname()

  return (
    <Bar>
      <Inner>
        <LogoLink href="/">LiquidInformatics</LogoLink>
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
