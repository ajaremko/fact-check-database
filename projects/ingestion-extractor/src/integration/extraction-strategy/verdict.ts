// No known RSS or Atom source emits a real <verdict> element — this only
// fires for a feed-specific extension, if one is ever encountered. It's kept
// because it's free to leave running, not because it's currently load-bearing.
const VERDICT_PATTERNS = [
  { pattern: /false/i, value: 'false' },
  { pattern: /misleading/i, value: 'misleading' },
  { pattern: /no evidence/i, value: 'unsupported' },
  { pattern: /exaggerat/i, value: 'exaggerated' },
] as const

export function extractVerdict(text?: string | null) {
  if (!text) return null
  for (const { pattern, value } of VERDICT_PATTERNS) {
    if (pattern.test(text)) {
      return value
    }
  }
  return null
}
