import { Schema } from 'effect'

import { Unicode } from '../../../data'

function normalizeText(text: string) {
  return text
    .normalize('NFC')
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
).pipe(Unicode.parseUnicode())
