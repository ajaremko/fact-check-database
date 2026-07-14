import { Effect, Schema } from 'effect'

import { makeExtractionStrategy } from './ExtractionStrategy'
import { decodeFeedXml } from './decodeFeedXml'
import { buildFactCheck, isUrlShaped, toArray } from './buildFactCheck'

const LinkSchema = Schema.Union(
  Schema.String,
  Schema.Struct({ href: Schema.String })
)

// fast-xml-parser omits '#text' entirely for empty/attribute-only elements
// (e.g. Rappler's `<guid isPermaLink="false"></guid>`) — it must stay
// optional or a single item with an empty guid fails to decode the whole
// document.
const GuidSchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    '#text': Schema.optional(Schema.String),
    isPermaLink: Schema.optional(Schema.String),
  })
)

const CategorySchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    '#text': Schema.optional(Schema.String),
    domain: Schema.optional(Schema.String),
  })
)

const EnclosureSchema = Schema.Struct({
  url: Schema.optional(Schema.String),
})

const MediaImageSchema = Schema.Struct({
  url: Schema.optional(Schema.String),
})

const RssItemSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  link: Schema.optional(LinkSchema),
  guid: Schema.optional(GuidSchema),
  author: Schema.optional(Schema.String),
  'dc:creator': Schema.optional(Schema.String),
  category: Schema.optional(
    Schema.Union(CategorySchema, Schema.Array(CategorySchema))
  ),
  description: Schema.optional(Schema.String),
  'content:encoded': Schema.optional(Schema.String),
  pubDate: Schema.optional(Schema.String),
  enclosure: Schema.optional(
    Schema.Union(EnclosureSchema, Schema.Array(EnclosureSchema))
  ),
  'media:thumbnail': Schema.optional(
    Schema.Union(MediaImageSchema, Schema.Array(MediaImageSchema))
  ),
  'media:content': Schema.optional(
    Schema.Union(MediaImageSchema, Schema.Array(MediaImageSchema))
  ),
}).annotations({ title: 'RssItem' })

const RssDocumentSchema = Schema.Struct({
  rss: Schema.Struct({
    channel: Schema.Struct({
      language: Schema.optional(Schema.String),
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
  if (typeof guid === 'string') return { value: guid || null, isPermaLink: true }
  return {
    value: guid['#text'] || null,
    isPermaLink: guid.isPermaLink !== 'false',
  }
}

function categoryText(category: typeof CategorySchema.Type): string | null {
  if (typeof category === 'string') return category || null
  return category['#text'] || null
}

// Some items carry more than one <enclosure> (e.g. video + a duplicate
// mirror); the first is a reasonable single representative.
function pickEnclosureUrl(
  enclosure:
    | typeof EnclosureSchema.Type
    | readonly (typeof EnclosureSchema.Type)[]
    | undefined
): string | null {
  return toArray(enclosure)[0]?.url ?? null
}

// Prefer media:thumbnail (usually a display-sized crop) over media:content
// (often the same image, sometimes higher-resolution or a video poster).
function pickImageUrl(
  thumbnail:
    | typeof MediaImageSchema.Type
    | readonly (typeof MediaImageSchema.Type)[]
    | undefined,
  content:
    | typeof MediaImageSchema.Type
    | readonly (typeof MediaImageSchema.Type)[]
    | undefined
): string | null {
  return toArray(thumbnail)[0]?.url ?? toArray(content)[0]?.url ?? null
}

export const RssExtractor = makeExtractionStrategy({
  id: 'rss',
  version: 1,
  extractor: (input) =>
    Effect.gen(function* () {
      const { rss } = yield* decodeRss(input.data)
      const extractedFactChecks = []

      // RSS 2.0 has no per-item language element; the channel-level default
      // is a best-effort fallback, not a guarantee (some multilingual feeds,
      // e.g. Dubawa, declare one channel language but mix items in others).
      const channelLanguage = rss.channel.language ?? null

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
          categories: toArray(item.category)
            .map(categoryText)
            .filter((c): c is string => c !== null),
          summary: item.description ?? null,
          content: item['content:encoded'] ?? null,
          language: channelLanguage,
          enclosureUrl: pickEnclosureUrl(item.enclosure),
          imageUrl: pickImageUrl(item['media:thumbnail'], item['media:content']),
          publishedAtRaw: item.pubDate ?? null,
        })
        extractedFactChecks.push(factCheck)
      }
      return extractedFactChecks
    }),
})
