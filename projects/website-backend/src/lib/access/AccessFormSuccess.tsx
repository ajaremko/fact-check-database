'use client'

import Link from 'next/link'
import styled from 'styled-components'

import { FormSuccess, FormSuccessHeading } from '@/lib/forms'
import { BodyText } from '@/lib/layout'
import { C } from '@/lib/theme'

const ReturnLink = styled(Link)`
  font-size: 0.9375rem;
  color: ${C.accent};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`

export function AccessFormSuccess() {
  return (
    <FormSuccess>
      <FormSuccessHeading>Request received.</FormSuccessHeading>
      <BodyText>
        Access requests are typically reviewed within 5 business days. We'll
        follow up at the email address you provided to discuss your project and
        confirm your access level.
      </BodyText>
      <ReturnLink href="/dataset">Return to dataset →</ReturnLink>
    </FormSuccess>
  )
}
