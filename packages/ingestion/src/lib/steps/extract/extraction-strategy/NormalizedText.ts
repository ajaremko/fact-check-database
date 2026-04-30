import { Schema } from 'effect'

function normalizeText(text: string) {
  return text
    .replace(/’/g, "'")
    .replace(/[^\x20-\x7E]/g, '')
    .split(/\s+/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
}

export const NormalizedTextSchema = Schema.transform(
  Schema.String,
  Schema.String,
  {
    strict: true,
    decode: normalizeText,
    encode: normalizeText,
  }
)
