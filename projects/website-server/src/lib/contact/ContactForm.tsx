'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { z } from 'zod'

import { C } from '@/lib/theme'

import { submitContactForm } from './actions'

// --- Schema ---

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  topic: z.string().min(1, 'Please select a topic'),
  message: z.string().min(1, 'Message is required'),
})

type ContactFormData = z.infer<typeof contactSchema>

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

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({ resolver: zodResolver(contactSchema) })

  const onSubmit = async (data: ContactFormData) => {
    const result = await submitContactForm(data)
    if (result.success) setSubmitted(true)
  }

  if (submitted) {
    return (
      <SuccessMessage>
        <SuccessTitle>Message received</SuccessTitle>
        <SuccessText>
          Thank you for reaching out. We&apos;ll follow up at the email address
          you provided.
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

      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </SubmitButton>
    </Form>
  )
}
