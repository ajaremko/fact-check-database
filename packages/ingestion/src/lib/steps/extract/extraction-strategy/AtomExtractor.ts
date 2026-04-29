import { Effect, pipe, Schema } from 'effect'

import { Node, Xml } from '../../../util'

import { makeExtractionStrategy } from './ExtractionStrategy'
import { FactCheck } from '../FactCheck'

const AtomEntrySchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  verdict: Schema.optional(Schema.String),
  link: Schema.optional(
    Schema.Union(Schema.String, Schema.Struct({ href: Schema.String }))
  ),
  description: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  pubDate: Schema.optional(Schema.String),
})

const AtomDocumentSchema = Schema.Struct({
  feed: Schema.Struct({
    entry: Schema.Array(AtomEntrySchema),
  }),
})

const decodeAtom = pipe(
  AtomDocumentSchema,
  Xml.parseXml({
    parser: {
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: true,
      trimValues: true,
    },
  }),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

function extractClaim(title?: string) {
  if (!title) return null
  // Basic normalization
  return title.trim()
}

const VERDICT_PATTERNS = [
  { pattern: /false/i, value: 'false' },
  { pattern: /misleading/i, value: 'misleading' },
  { pattern: /no evidence/i, value: 'unsupported' },
  { pattern: /exaggerat/i, value: 'exaggerated' },
] as const

function extractVerdict(text?: string) {
  if (!text) return null
  for (const { pattern, value } of VERDICT_PATTERNS) {
    if (pattern.test(text)) {
      return value
    }
  }
  return null
}

export const AtomExtractor = makeExtractionStrategy({
  id: 'atom',
  canHandle: (source) => source.collection === 'atom',
  extractor: (input) =>
    Effect.gen(function* () {
      const { feed } = yield* decodeAtom(input.data)
      const extractedFactChecks = []

      const entries = feed.entry
        ? feed.entry instanceof Array
          ? feed.entry
          : [feed.entry]
        : []

      for (const item of entries) {
        const values = {
          link: item.link,
          title: item.title ?? null,
          claim: extractClaim(item.title),
          verdict: extractVerdict(item.title),
          summary: item.description ?? null,
          publishedAt: item.pubDate ?? null,
        }
        const sha256 = yield* Node.sha256Hex(JSON.stringify(values), 'utf-8')
        const factCheck = new FactCheck({
          sha256,
          claim: values.claim,
          link: values.link ? JSON.stringify(values.link) : null,
          title: values.title,
          verdict: values.verdict,
          normalizeVerdict: values.verdict,
          summary: values.summary,
          publishedAt: values.publishedAt,
          canonicalUrl: null,
          extractorVersion: '1',
          extractedFrom: null,
        })
        extractedFactChecks.push(factCheck)
      }
      return extractedFactChecks
    }),
})
