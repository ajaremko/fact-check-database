'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { z } from 'zod'

import { C } from '@/lib/theme'

import { submitAccessRequest } from './actions'

// --- Schema ---

const accessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  affiliation: z.string().min(1, 'Affiliation is required'),
  projectDescription: z.string().min(1, 'Project description is required'),
  dataVolume: z.enum(['lt10k', '10k-100k', 'gt100k', 'unsure'], {
    message: 'Please select an expected volume',
  }),
  accessType: z.array(z.string()).min(1, 'Select at least one access type'),
})

type AccessFormData = z.infer<typeof accessSchema>

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

const Select = styled.select<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgBase};
  border: 1px solid ${({ $hasError }) => ($hasError ? '#c0392b' : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? '#c0392b' : C.accent)};
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
  min-height: 8rem;
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

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9375rem;
  color: ${C.textSecondary};
  cursor: pointer;

  input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    accent-color: ${C.accent};
    flex-shrink: 0;
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

export function AccessForm() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessFormData>({
    resolver: zodResolver(accessSchema),
    defaultValues: { accessType: [] },
  })

  const onSubmit = async (data: AccessFormData) => {
    const result = await submitAccessRequest(data)
    if (result.success) setSubmitted(true)
  }

  if (submitted) {
    return (
      <SuccessMessage>
        <SuccessTitle>Request received</SuccessTitle>
        <SuccessText>
          Thank you for your interest. Access requests are typically reviewed
          within 5 business days. We&apos;ll follow up at the email address you
          provided to discuss your project and confirm your access level.
        </SuccessText>
      </SuccessMessage>
    )
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormGroup>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          $hasError={!!errors.name}
          {...register('name')}
        />
        {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          $hasError={!!errors.email}
          {...register('email')}
        />
        {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="affiliation">Institutional Affiliation</Label>
        <Input
          id="affiliation"
          type="text"
          placeholder="University, organization, or Independent Researcher"
          $hasError={!!errors.affiliation}
          {...register('affiliation')}
        />
        {errors.affiliation && (
          <ErrorText>{errors.affiliation.message}</ErrorText>
        )}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="projectDescription">Project Description</Label>
        <Textarea
          id="projectDescription"
          placeholder="Briefly describe your research project or intended use case…"
          $hasError={!!errors.projectDescription}
          {...register('projectDescription')}
        />
        {errors.projectDescription && (
          <ErrorText>{errors.projectDescription.message}</ErrorText>
        )}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="dataVolume">Expected Data Volume</Label>
        <Select
          id="dataVolume"
          $hasError={!!errors.dataVolume}
          defaultValue=""
          {...register('dataVolume')}
        >
          <option value="" disabled>
            Select an estimate…
          </option>
          <option value="lt10k">&lt; 10,000 records</option>
          <option value="10k-100k">10,000 – 100,000 records</option>
          <option value="gt100k">100,000+ records</option>
          <option value="unsure">Unsure</option>
        </Select>
        {errors.dataVolume && (
          <ErrorText>{errors.dataVolume.message}</ErrorText>
        )}
      </FormGroup>

      <FormGroup>
        <Label>Access Type Needed</Label>
        <CheckboxGroup>
          <CheckboxRow>
            <input
              type="checkbox"
              value="bigquery"
              {...register('accessType')}
            />
            BigQuery direct access
          </CheckboxRow>
          <CheckboxRow>
            <input type="checkbox" value="gcs" {...register('accessType')} />
            GCS export
          </CheckboxRow>
        </CheckboxGroup>
        {errors.accessType && (
          <ErrorText>{errors.accessType.message}</ErrorText>
        )}
      </FormGroup>

      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Request'}
      </SubmitButton>
    </Form>
  )
}
