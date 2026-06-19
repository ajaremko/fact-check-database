'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { RecaptchaWidget, useGetRecaptchaToken } from '@/lib/forms'
import {
  CheckboxGroup,
  CheckboxRow,
  ErrorText,
  Form,
  FormGroup,
  Input,
  Label,
  Select,
  SubmitButton,
  SuccessMessage,
  SuccessText,
  SuccessTitle,
  Textarea,
} from '@/lib/forms/styled'

import { submitAccessRequest } from './actions'

// --- Schema ---

const accessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  affiliation: z.string().min(1, 'Affiliation is required'),
  projectDescription: z.string().min(1, 'Project description is required'),
  dataVolume: z.enum(['lt10k', '10k-100k', 'gt100k', 'unsure'], {
    message: 'Please select an expected volume',
  }),
  accessType: z.array(z.string()).min(1, 'Select at least one access type'),
})

type AccessFormData = z.infer<typeof accessSchema>

// --- Component ---

export function AccessForm() {
  const [submitted, setSubmitted] = useState(false)
  const getRecaptchaToken = useGetRecaptchaToken('access_request')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessFormData>({
    resolver: zodResolver(accessSchema),
    defaultValues: { accessType: [] },
  })

  const onSubmit = async (data: AccessFormData) => {
    try {
      const recaptchaToken = await getRecaptchaToken()
      const result = await submitAccessRequest({ ...data, recaptchaToken })
      if (result.success) setSubmitted(true)
    } catch (error) {
      console.error(error)
      setSubmitted(false)
    }
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

      <RecaptchaWidget />
      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Request'}
      </SubmitButton>
    </Form>
  )
}
