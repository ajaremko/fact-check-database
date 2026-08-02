export const C = {
  bgBase: '#111111',
  bgSurface: '#1c1c1c',
  bgCode: '#242424',
  borderSubtle: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#b3b3b3',
  textMuted: '#808080',
  accent: '#4ade80',
  accentHover: '#22c55e',
  error: '#c0392b',
  success: '#27ae60',
} as const

export const bp = { md: '@media (min-width: 768px)' } as const

export const serif = `var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
export const mono = `var(--font-red-hat-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`
