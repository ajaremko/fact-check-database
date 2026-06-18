'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'

import { C } from '@/lib/theme'

import { type SubmissionsFormData, submitTip } from './actions'

// --- Styled components ---

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`

const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${C.textSecondary};
`

const OptionalTag = styled.span`
  font-weight: 400;
  color: ${C.textMuted};
  margin-left: 0.375rem;
`

const Input = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgBase};
  border: 1px solid ${({ $hasError }) => ($hasError ? '#c0392b' : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? '#c0392b' : C.accent)};
  }

  &::placeholder {
    color: ${C.textMuted};
  }
`

const Textarea = styled.textarea<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgBase};
  border: 1px solid ${({ $hasError }) => ($hasError ? '#c0392b' : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
  min-height: 6rem;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? '#c0392b' : C.accent)};
  }

  &::placeholder {
    color: ${C.textMuted};
  }
`

const ErrorText = styled.span`
  font-size: 0.8125rem;
  color: #c0392b;
`

const SubmitButton = styled.button`
  align-self: flex-start;
  display: inline-block;
  background-color: ${C.accent};
  color: ${C.bgBase};
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    background-color: ${C.accentHover};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SuccessMessage = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-left: 3px solid ${C.accent};
  border-radius: 0 6px 6px 0;
  padding: 2rem 2.5rem;
`

const SuccessTitle = styled.p`
  font-size: 1rem;
  font-weight: 700;
  color: ${C.textPrimary};
  margin: 0 0 0.5rem;
`

const SuccessText = styled.p`
  font-size: 0.9375rem;
  color: ${C.textSecondary};
  line-height: 1.6;
  margin: 0;
`

// --- Component ---

export function SubmissionsForm() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionsFormData>()

  const onSubmit = async (data: SubmissionsFormData) => {
    const result = await submitTip(data)
    if (result.success) setSubmitted(true)
  }

  if (submitted) {
    return (
      <SuccessMessage>
        <SuccessTitle>Tip received</SuccessTitle>
        <SuccessText>
          Thank you for the submission. We review all tips and will follow up if
          your source leads to a new integration.
        </SuccessText>
      </SuccessMessage>
    )
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormGroup>
        <Label htmlFor="claim">Claim or article being fact-checked</Label>
        <Input
          id="claim"
          type="text"
          placeholder="The specific claim or article title"
          $hasError={!!errors.claim}
          {...register('claim', { required: 'This field is required' })}
        />
        {errors.claim && <ErrorText>{errors.claim.message}</ErrorText>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="organization">
          Organization that published the fact-check
        </Label>
        <Input
          id="organization"
          type="text"
          placeholder="e.g. PolitiFact, Snopes, AFP Fact Check"
          $hasError={!!errors.organization}
          {...register('organization', {
            required: 'Organization is required',
          })}
        />
        {errors.organization && (
          <ErrorText>{errors.organization.message}</ErrorText>
        )}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="url">URL to the fact-check</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://"
          $hasError={!!errors.url}
          {...register('url', {
            required: 'URL is required',
            pattern: {
              value: /^https?:\/\/.+/,
              message: 'Enter a valid URL starting with http:// or https://',
            },
          })}
        />
        {errors.url && <ErrorText>{errors.url.message}</ErrorText>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="context">
          Additional context
          <OptionalTag>(optional)</OptionalTag>
        </Label>
        <Textarea
          id="context"
          placeholder="Why is this source particularly valuable? Any notes on data format or availability…"
          {...register('context')}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="contactEmail">
          Your email
          <OptionalTag>(optional — for follow-up)</OptionalTag>
        </Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="you@example.com"
          $hasError={!!errors.contactEmail}
          {...register('contactEmail', {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
        />
        {errors.contactEmail && (
          <ErrorText>{errors.contactEmail.message}</ErrorText>
        )}
      </FormGroup>

      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Tip'}
      </SubmitButton>
    </Form>
  )
}
