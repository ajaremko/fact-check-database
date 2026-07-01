'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  RecaptchaScript,
  RecaptchaWidget,
  useGetRecaptchaToken,
} from '@/lib/forms'
import { isRedirectError } from '@/lib/forms/redirectError'
import {
  ErrorText,
  Form,
  FormError,
  FormGroup,
  Input,
  Label,
  Select,
  Spinner,
  SubmitButton,
  Textarea,
} from '@/lib/forms/styled'

import { submitContactForm } from './actions'

// --- Schema ---

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  topic: z.string().min(1, 'Please select a topic'),
  message: z.string().min(1, 'Message is required'),
})

type ContactFormData = z.infer<typeof contactSchema>

// --- Component ---

export function ContactForm() {
  const [submitError, setSubmitError] = useState(false)
  const getRecaptchaToken = useGetRecaptchaToken('contact_form_submission')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setSubmitError(false)
    try {
      const recaptchaToken = await getRecaptchaToken()
      await submitContactForm({ ...data, recaptchaToken })
      setSubmitError(true)
    } catch (err) {
      if (isRedirectError(err)) throw err
      console.error(err)
      setSubmitError(true)
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
        <Label htmlFor="topic">Topic</Label>
        <Select
          id="topic"
          $hasError={!!errors.topic}
          {...register('topic')}
          defaultValue=""
        >
          <option value="" disabled>
            Select a topic…
          </option>
          <option value="general">General Inquiry</option>
          <option value="press">Press / Media</option>
          <option value="collaboration">Collaboration</option>
          <option value="feedback">Feedback</option>
          <option value="other">Other</option>
        </Select>
        {errors.topic && <ErrorText>{errors.topic.message}</ErrorText>}
      </FormGroup>
      <FormGroup>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Your message…"
          $hasError={!!errors.message}
          {...register('message')}
        />
        {errors.message && <ErrorText>{errors.message.message}</ErrorText>}
      </FormGroup>
      <RecaptchaWidget />
      <RecaptchaScript />
      {submitError && (
        <FormError>Something went wrong. Please try again.</FormError>
      )}
      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner />}
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </SubmitButton>
    </Form>
  )
}
