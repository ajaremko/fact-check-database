import { Effect, pipe, Schema } from 'effect'

import * as Node from '@news-research/ingestion-data/Node'
import * as Xml from '@news-research/ingestion-data/Xml'

import { FactCheckSchema } from '../FactCheck'

import { makeExtractionStrategy } from './ExtractionStrategy'

const AtomEntrySchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  title: Schema.optional(FactCheckSchema.fields.title),
  verdict: Schema.optional(FactCheckSchema.fields.verdictRaw),
  link: Schema.optional(
    Schema.Union(Schema.String, Schema.Struct({ href: Schema.String }))
  ),
  description: Schema.optional(FactCheckSchema.fields.summary),
  summary: Schema.optional(FactCheckSchema.fields.summary),
  pubDate: Schema.optional(FactCheckSchema.fields.publishedAtRaw),
})

const AtomDocumentSchema = Schema.Struct({
  feed: Schema.Struct({
    entry: Schema.optional(
      Schema.Union(AtomEntrySchema, Schema.Array(AtomEntrySchema))
    ),
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

const VERDICT_PATTERNS = [
  { pattern: /false/i, value: 'false' },
  { pattern: /misleading/i, value: 'misleading' },
  { pattern: /no evidence/i, value: 'unsupported' },
  { pattern: /exaggerat/i, value: 'exaggerated' },
] as const

function extractVerdict<T extends string>(text?: T | null) {
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
  version: 1,
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
          claim: item.title ?? null,
          verdict: item.verdict ?? null,
          summary: item.description ?? null,
          publishedAt: item.pubDate ?? null,
        }

        const sha256 = yield* Node.sha256Hex(JSON.stringify(values), 'utf-8')
        const factCheck = FactCheckSchema.make({
          sha256,
          claim: values.claim,
          link:
            typeof values.link === 'string'
              ? values.link
              : values.link?.href ?? null,
          title: values.title,
          verdictRaw: values.verdict,
          verdictNormalized: extractVerdict(values.verdict),
          summary: values.summary,
          publishedAtRaw: values.publishedAt,
          publishedAtNormalized: null,
          canonicalUrl: null,
        })
        extractedFactChecks.push(factCheck)
      }
      return extractedFactChecks
    }),
})
