export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as Record<string, unknown>).digest === 'string' &&
    (err as Record<string, string>).digest.startsWith('NEXT_REDIRECT')
  )
}
