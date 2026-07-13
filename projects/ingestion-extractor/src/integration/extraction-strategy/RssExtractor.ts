import { Effect, Schema } from 'effect'

import { makeExtractionStrategy } from './ExtractionStrategy'
import { decodeFeedXml } from './decodeFeedXml'
import { buildFactCheck, isUrlShaped, toArray } from './buildFactCheck'

const LinkSchema = Schema.Union(
  Schema.String,
  Schema.Struct({ href: Schema.String })
)

const GuidSchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    '#text': Schema.String,
    isPermaLink: Schema.optional(Schema.String),
  })
)

const CategorySchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    '#text': Schema.String,
    domain: Schema.optional(Schema.String),
  })
)

const RssItemSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  link: Schema.optional(LinkSchema),
  guid: Schema.optional(GuidSchema),
  author: Schema.optional(Schema.String),
  'dc:creator': Schema.optional(Schema.String),
  category: Schema.optional(
    Schema.Union(CategorySchema, Schema.Array(CategorySchema))
  ),
  verdict: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  'content:encoded': Schema.optional(Schema.String),
  pubDate: Schema.optional(Schema.String),
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

const decodeRss = decodeFeedXml(RssDocumentSchema)

function unwrapLink(link: typeof LinkSchema.Type | undefined): string | null {
  if (link === undefined) return null
  return typeof link === 'string' ? link : link.href
}

function unwrapGuid(guid: typeof GuidSchema.Type | undefined): {
  value: string | null
  isPermaLink: boolean
} {
  if (guid === undefined) return { value: null, isPermaLink: true }
  if (typeof guid === 'string') return { value: guid, isPermaLink: true }
  return { value: guid['#text'], isPermaLink: guid.isPermaLink !== 'false' }
}

function categoryText(category: typeof CategorySchema.Type): string {
  return typeof category === 'string' ? category : category['#text']
}

export const RssExtractor = makeExtractionStrategy({
  id: 'rss',
  version: 1,
  extractor: (input) =>
    Effect.gen(function* () {
      const { rss } = yield* decodeRss(input.data)
      const extractedFactChecks = []

      const items = [
        ...toArray(rss.channel.item),
        ...toArray(rss.channel.entry),
      ]

      for (const item of items) {
        const link = unwrapLink(item.link)
        const guid = unwrapGuid(item.guid)
        const canonicalUrl =
          guid.isPermaLink && isUrlShaped(guid.value) ? guid.value : link

        const factCheck = yield* buildFactCheck({
          guid: guid.value,
          link,
          canonicalUrl,
          title: item.title ?? null,
          author: item['dc:creator'] ?? item.author ?? null,
          categories: toArray(item.category).map(categoryText),
          summary: item.description ?? null,
          content: item['content:encoded'] ?? null,
          language: null,
          verdictRaw: item.verdict ?? null,
          publishedAtRaw: item.pubDate ?? null,
        })
        extractedFactChecks.push(factCheck)
      }
      return extractedFactChecks
    }),
})
