import { Effect, Schema } from 'effect'

import { makeExtractionStrategy } from './ExtractionStrategy'
import { decodeFeedXml } from './decodeFeedXml'
import { buildFactCheck, isUrlShaped, toArray } from './buildFactCheck'

const AtomLinkSchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    href: Schema.String,
    rel: Schema.optional(Schema.String),
  })
)

const AtomCategorySchema = Schema.Struct({
  term: Schema.optional(Schema.String),
  scheme: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
})

const AtomEntrySchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  link: Schema.optional(
    Schema.Union(AtomLinkSchema, Schema.Array(AtomLinkSchema))
  ),
  author: Schema.optional(
    Schema.Struct({ name: Schema.optional(Schema.String) })
  ),
  category: Schema.optional(
    Schema.Union(AtomCategorySchema, Schema.Array(AtomCategorySchema))
  ),
  summary: Schema.optional(Schema.String),
  content: Schema.optional(Schema.Unknown),
  'xml:lang': Schema.optional(Schema.String),
  updated: Schema.optional(Schema.String),
  published: Schema.optional(Schema.String),
})

const AtomDocumentSchema = Schema.Struct({
  feed: Schema.Struct({
    entry: Schema.optional(
      Schema.Union(AtomEntrySchema, Schema.Array(AtomEntrySchema))
    ),
  }),
})

const decodeAtom = decodeFeedXml(AtomDocumentSchema)

function pickAlternateLink(
  link:
    | typeof AtomLinkSchema.Type
    | readonly (typeof AtomLinkSchema.Type)[]
    | undefined
): string | null {
  const links = toArray(link).map((l) =>
    typeof l === 'string' ? { href: l, rel: undefined } : l
  )
  const alternate = links.find((l) => l.rel === 'alternate' || !l.rel)
  return alternate?.href ?? links[0]?.href ?? null
}

function categoryText(category: typeof AtomCategorySchema.Type): string | null {
  return category.term ?? category.label ?? null
}

// <content type="html">...</content> parses to { type: 'html', '#text': '...' }
// once any attribute is present, not a plain string — a type-only guard drops
// the entire body for feeds like Demagog.cz, which set `type` on every entry.
function unwrapContent(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (
    content &&
    typeof content === 'object' &&
    '#text' in content &&
    typeof (content as { '#text': unknown })['#text'] === 'string'
  ) {
    return (content as { '#text': string })['#text']
  }
  return null
}

export const AtomExtractor = makeExtractionStrategy({
  id: 'atom',
  version: 1,
  extractor: (input) =>
    Effect.gen(function* () {
      const { feed } = yield* decodeAtom(input.data)
      const extractedFactChecks = []

      for (const item of toArray(feed.entry)) {
        const link = pickAlternateLink(item.link)
        const canonicalUrl =
          link ?? (isUrlShaped(item.id) ? item.id : null)
        const categories = toArray(item.category)
          .map(categoryText)
          .filter((c): c is string => c !== null)

        const factCheck = yield* buildFactCheck({
          guid: item.id ?? null,
          link,
          canonicalUrl,
          title: item.title ?? null,
          author: item.author?.name ?? null,
          categories,
          summary: item.summary ?? null,
          content: unwrapContent(item.content),
          language: item['xml:lang'] ?? null,
          enclosureUrl: null,
          imageUrl: null,
          publishedAtRaw: item.published ?? item.updated ?? null,
        })
        extractedFactChecks.push(factCheck)
      }
      return extractedFactChecks
    }),
})
