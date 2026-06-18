'use client'

import Link from 'next/link'
import styled from 'styled-components'

import { Container } from '@/lib/layout'
import { C, bp } from '@/lib/theme'

const FooterNav = styled.nav`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem 1.5rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${C.borderSubtle};
  text-align: left;

  ${bp.md} {
    grid-template-columns: repeat(4, 1fr);
  }
`

const GroupHeading = styled.p`
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${C.textSecondary};
  margin: 0 0 0.75rem;
`

const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

const ExternalLink = styled.a`
  font-size: 0.8125rem;
  color: ${C.textMuted};
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover {
    color: ${C.textSecondary};
  }
`

export function NavFooter() {
  return (
    <Container>
      <FooterNav>
        <div>
          <GroupHeading>Organization</GroupHeading>
          <LinkList>
            <li>
              <FooterNavLink href="/mission">Mission</FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/team">Team</FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/contact">Contact</FooterNavLink>
            </li>
          </LinkList>
        </div>
        <div>
          <GroupHeading>Dataset</GroupHeading>
          <LinkList>
            <li>
              <FooterNavLink href="/dataset">About</FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/dataset/methodology">
                Methodology
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/dataset/access">
                Request Access
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/dataset/corrections">
                Corrections
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/dataset/submissions">
                Submissions
              </FooterNavLink>
            </li>
          </LinkList>
        </div>
        <div>
          <GroupHeading>Legal</GroupHeading>
          <LinkList>
            <li>
              <FooterNavLink href="/legal/terms">
                Terms of Service
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink href="/legal/privacy">
                Privacy Policy
              </FooterNavLink>
            </li>
          </LinkList>
        </div>
        <div>
          <GroupHeading>Social</GroupHeading>
          <LinkList>
            <li>
              <ExternalLink href="#" target="_blank" rel="noopener noreferrer">
                Facebook
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href="#" target="_blank" rel="noopener noreferrer">
                Twitter
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href="#" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </ExternalLink>
            </li>
          </LinkList>
        </div>
      </FooterNav>
    </Container>
  )
}
