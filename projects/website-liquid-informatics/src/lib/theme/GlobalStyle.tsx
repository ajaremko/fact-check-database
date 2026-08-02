'use client'

import { createGlobalStyle } from 'styled-components'

import { C } from '@/lib/theme'

export const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${C.bgBase};
  }
`
