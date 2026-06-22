'use client'

import { useRouter } from 'next/navigation'
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
  SubmitButton,
  Textarea,
} from '@/lib/forms/styled'

import { submitAccessRequest } from './actions'

// --- Schema ---

const accessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email address').min(1, 'Email is required'),
  affiliation: z.string().min(1, 'Affiliation is required'),
  projectDescription: z.string().min(1, 'Project description is required'),
})

type AccessFormData = z.infer<typeof accessSchema>

// --- Component ---

export function AccessForm() {
  const router = useRouter()
  const getRecaptchaToken = useGetRecaptchaToken('access_request')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessFormData>({
    resolver: zodResolver(accessSchema),
  })

  const onSubmit = async (data: AccessFormData) => {
    try {
      const recaptchaToken = await getRecaptchaToken()
      const result = await submitAccessRequest({ ...data, recaptchaToken })
      if (result.success) router.push('/dataset/access/success')
    } catch (error) {
      console.error(error)
    }
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
      <RecaptchaWidget />
      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Request'}
      </SubmitButton>
    </Form>
  )
}
