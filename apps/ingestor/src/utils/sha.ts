import { Effect } from 'effect'
import { createHash } from 'node:crypto'

export function sha256Hex(bytes: Uint8Array) {
  return Effect.sync(() => createHash('sha256').update(bytes).digest('hex'))
}

export function sha256HexString(s: string) {
  return Effect.sync(() => createHash('sha256').update(s, 'utf8').digest('hex'))
}
