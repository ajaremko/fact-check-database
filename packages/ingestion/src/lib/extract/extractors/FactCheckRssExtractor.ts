import { Effect, pipe, Schema } from 'effect'

import { Node, Xml } from '../../util'

import { makeExtractor } from './Extractor'

const ItemSchema = Schema.Struct({
  title: Schema.String,
  link: Schema.String,
  description: Schema.String,
  pubDate: Schema.String,
})

const DocumentSchema = Schema.Struct({
  rss: Schema.Struct({
    channel: Schema.Struct({
      item: Schema.Union(ItemSchema, Schema.Array(ItemSchema)),
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

function extractClaim(title?: string): string | null {
  if (!title) return null
  // Basic normalization
  return title.trim()
}

const VERDICT_PATTERNS = [
  { pattern: /false/i, value: 'false' },
  { pattern: /misleading/i, value: 'misleading' },
  { pattern: /no evidence/i, value: 'unsupported' },
  { pattern: /exaggerat/i, value: 'exaggerated' },
]

function extractVerdict(text?: string): string | null {
  if (!text) return null
  for (const { pattern, value } of VERDICT_PATTERNS) {
    if (pattern.test(text)) {
      return value
    }
  }
  return null
}

function parseDate(date?: string): Date | null {
  if (!date) return null
  const parsed = new Date(date)
  return isNaN(parsed.getTime()) ? null : parsed
}

export const FactCheckRssExtractor = makeExtractor({
  id: 'fact-check-rss',
  canHandle: (source) =>
    source.collection === 'rss' && source.name === 'factcheck.org',
  extract: (record, content) =>
    Effect.gen(function* () {
      const { rss } = yield* decodeRss(content)
      const items =
        rss.channel.item instanceof Array
          ? rss.channel.item
          : [rss.channel.item]

      return items.map((item) => ({
        observation_id: record.runId,
        run_id: record.runId,
        source: record.source,
        url: item.link,
        final_url: item.link,
        title: item.title ?? null,
        claim: extractClaim(item.title),
        verdict: extractVerdict(item.title),
        published_at: parseDate(item.pubDate),
        fetched_at: new Date(record.fetchedAt),
        extracted_at: new Date(),
        http: record.http,
        content: record.content,
        policy: record.policy,
        extraction_error: null,
      }))
    }),
})
