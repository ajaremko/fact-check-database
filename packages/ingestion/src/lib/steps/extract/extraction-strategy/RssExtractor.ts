import { Effect, pipe, Schema } from 'effect'

import { Node, Xml } from '../../../util'

import { makeExtractionStrategy } from './ExtractionStrategy'

const ItemSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  link: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  pubDate: Schema.optional(Schema.String),
})

const DocumentSchema = Schema.Struct({
  rss: Schema.Struct({
    channel: Schema.Struct({
      item: Schema.optional(Schema.Union(ItemSchema, Schema.Array(ItemSchema))),
      entry: Schema.optional(
        Schema.Union(ItemSchema, Schema.Array(ItemSchema))
      ),
    }),
  }),
})

const decodeRss = pipe(
  DocumentSchema,
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
      const extractedClaims = []

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
        const id = yield* Node.sha256Hex(JSON.stringify(values), 'utf-8')
        const claim = {
          id,
          extractionId: input.extractionId,
          ingestionId: input.ingestionId,
          observationId: input.observationId,
          source: input.record.source,
          url: input.record.url,
          finalUrl: input.record.finalUrl || input.record.url,
          fetchedAt: input.record.fetchedAt,
          extractedAt: input.extractedAt,
          claim: values.claim,
          link: values.link,
          title: values.title,
          verdict: values.verdict,
          summary: values.summary,
          publishedAt: values.publishedAt,
        }
        extractedClaims.push(claim)
      }
      return extractedClaims
    }),
})
