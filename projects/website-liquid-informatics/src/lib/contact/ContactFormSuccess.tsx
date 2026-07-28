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

export function ContactFormSuccess() {
  return (
    <FormSuccess>
      <FormSuccessHeading>We received your message.</FormSuccessHeading>
      <BodyText>
        You'll receive a confirmation email shortly and we will respond to your
        message as quickly as possible.
      </BodyText>
      <ReturnLink href="/">Click here to return the homepage.</ReturnLink>
    </FormSuccess>
  )
}
