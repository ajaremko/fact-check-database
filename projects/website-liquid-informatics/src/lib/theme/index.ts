export const C = {
  bgBase: '#ffffff',
  bgSurface: '#f5f5f5',
  bgCode: '#ececec',
  borderSubtle: '#dddddd',
  textPrimary: '#111111',
  textSecondary: '#555555',
  textMuted: '#999999',
  accent: '#333333',
  accentHover: '#111111',
  error: '#c0392b',
  success: '#27ae60',
  bgDark: '#0d3b2c',
  textInverse: '#ffffff',
} as const

export const bp = { md: '@media (min-width: 768px)' } as const

export const serif = `var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
export const mono = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`
