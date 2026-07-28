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

export function SubmissionsFormSuccess() {
  return (
    <FormSuccess>
      <FormSuccessHeading>Tip received.</FormSuccessHeading>
      <BodyText>
        Thank you for the submission. We review all tips and will follow up if
        your source leads to a new integration.
      </BodyText>
      <ReturnLink href="/dataset">Return to dataset →</ReturnLink>
    </FormSuccess>
  )
}
