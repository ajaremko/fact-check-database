'use client'

import styled, { keyframes } from 'styled-components'

import { C } from '@/lib/theme'

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`

export const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${C.textSecondary};
`

export const OptionalTag = styled.span`
  font-weight: 400;
  color: ${C.textMuted};
  margin-left: 0.375rem;
`

export const Input = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgSurface};
  border: 1px solid
    ${({ $hasError }) => ($hasError ? C.error : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? C.error : C.accent)};
  }

  &::placeholder {
    color: ${C.textMuted};
  }
`

export const Select = styled.select<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgSurface};
  border: 1px solid
    ${({ $hasError }) => ($hasError ? C.error : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? C.error : C.accent)};
  }
`

export const Textarea = styled.textarea<{
  $hasError?: boolean
  $minHeight?: string
}>`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: ${C.textPrimary};
  background-color: ${C.bgSurface};
  border: 1px solid
    ${({ $hasError }) => ($hasError ? C.error : C.borderSubtle)};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
  min-height: ${({ $minHeight }) => $minHeight ?? '8rem'};
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? C.error : C.accent)};
  }

  &::placeholder {
    color: ${C.textMuted};
  }
`

export const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

export const CheckboxRow = styled.label`
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

export const ErrorText = styled.span`
  font-size: 0.8125rem;
  color: ${C.error};
`

export const FormError = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-left: 3px solid ${C.error};
  border-radius: 0 6px 6px 0;
  padding: 1rem 1.5rem;
  font-size: 0.9375rem;
  color: ${C.error};
  line-height: 1.6;
`

export const FormSuccess = styled.div`
  background-color: ${C.bgSurface};
  border: 1px solid ${C.borderSubtle};
  border-left: 3px solid ${C.success};
  border-radius: 0 6px 6px 0;
  padding: 1rem 1.5rem;
  font-size: 0.9375rem;
  color: ${C.success};
  line-height: 1.6;
`

export const FormSuccessHeading = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  line-height: 1.3;
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const Spinner = styled.span`
  width: 0.875em;
  height: 0.875em;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.6s linear infinite;
  flex-shrink: 0;
`

export const SubmitButton = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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
