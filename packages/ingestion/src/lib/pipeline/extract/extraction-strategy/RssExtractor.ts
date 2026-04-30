import { Effect, pipe, Schema } from 'effect'

import { Node, Xml } from '../../../data'

import { FactCheck } from '../FactCheck'

import { NormalizedTextSchema } from './NormalizedText'
import { makeExtractionStrategy } from './ExtractionStrategy'

const RssItemSchema = Schema.Struct({
  title: Schema.optional(NormalizedTextSchema),
  link: Schema.optional(
    Schema.Union(Schema.String, Schema.Struct({ href: Schema.String }))
  ),
  description: Schema.optional(NormalizedTextSchema),
  pubDate: Schema.optional(NormalizedTextSchema),
}).annotations({ title: 'RssItem' })

const RssDocumentSchema = Schema.Struct({
  rss: Schema.Struct({
    channel: Schema.Struct({
      item: Schema.optional(
        Schema.Union(RssItemSchema, Schema.Array(RssItemSchema))
      ),
      entry: Schema.optional(
        Schema.Union(RssItemSchema, Schema.Array(RssItemSchema))
      ),
    }),
  }),
}).annotations({ title: 'RssDocument' })

const decodeRss = pipe(
  RssDocumentSchema,
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

export const RssExtractor = makeExtractionStrategy({
  id: 'rss',
  canHandle: (source) => source.collection === 'rss',
  extractor: (input) =>
    Effect.gen(function* () {
      const { rss } = yield* decodeRss(input.data)
      const extractedFactChecks = []

      const items = rss.channel.item
        ? rss.channel.item instanceof Array
          ? rss.channel.item
          : [rss.channel.item]
        : []
      const entries = rss.channel.entry
        ? rss.channel.entry instanceof Array
          ? rss.channel.entry
          : [rss.channel.entry]
        : []

      for (const item of [...items, ...entries]) {
        const values = {
          link: item.link,
          title: item.title ?? null,
          claim: extractClaim(item.title),
          verdict: extractVerdict(item.title),
          summary: item.description ?? null,
          publishedAt: item.pubDate ?? null,
        }
        const sha256 = yield* Node.sha256Hex(JSON.stringify(values), 'utf-8')
        const factCheck = FactCheck.make({
          sha256,
          claim: values.claim,
          link:
            typeof values.link === 'string'
              ? values.link
              : values.link?.href ?? null,
          title: values.title,
          verdict: values.verdict,
          normalizedVerdict: values.verdict,
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
