'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { RecaptchaWidget, useGetRecaptchaToken } from '@/lib/forms'
import {
  ErrorText,
  Form,
  FormGroup,
  Input,
  Label,
  OptionalTag,
  SubmitButton,
  SuccessMessage,
  SuccessText,
  SuccessTitle,
  Textarea,
} from '@/lib/forms/styled'

import { submitTip } from './actions'

// --- Schema ---

const submissionsSchema = z.object({
  claim: z.string().min(1, 'This field is required'),
  organization: z.string().min(1, 'Organization is required'),
  url: z
    .url('Enter a valid URL starting with http:// or https://')
    .min(1, 'URL is required'),
  context: z.string().optional(),
  email: z.email('Enter a valid email address').or(z.literal('')).optional(),
})

type SubmissionsFormData = z.infer<typeof submissionsSchema>

// --- Component ---

export function SubmissionsForm() {
  const [submitted, setSubmitted] = useState(false)
  const getRecaptchaToken = useGetRecaptchaToken('tip_submission')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionsFormData>({ resolver: zodResolver(submissionsSchema) })

  const onSubmit = async (data: SubmissionsFormData) => {
    try {
      const recaptchaToken = await getRecaptchaToken()
      const result = await submitTip({ ...data, recaptchaToken })
      if (result.success) setSubmitted(true)
    } catch (error) {
      console.error(error)
      setSubmitted(false)
    }
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
          {...register('claim')}
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
          {...register('organization')}
        />
        {errors.organization && (
          <ErrorText>{errors.organization.message}</ErrorText>
        )}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="url">URL of source</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://"
          $hasError={!!errors.url}
          {...register('url')}
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
          $minHeight="6rem"
          placeholder="Why is this source particularly valuable? Any notes on data format or availability…"
          {...register('context')}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="email">
          Your email
          <OptionalTag>(optional — for follow-up)</OptionalTag>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          $hasError={!!errors.email}
          {...register('email')}
        />
        {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
      </FormGroup>

      <RecaptchaWidget />
      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Tip'}
      </SubmitButton>
    </Form>
  )
}
