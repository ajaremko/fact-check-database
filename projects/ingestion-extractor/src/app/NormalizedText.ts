import { Brand, Schema } from 'effect'

import * as Html from '@news-research/core-data/Html'
import { stripMarkdown } from '@news-research/core-data/Markdown'

function collapseWhitespace(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word !== '')
    .join(' ')
}

function normalizeText(maxLength: number) {
  return (text: string) =>
    collapseWhitespace(text.normalize('NFC')).slice(0, maxLength)
}

/**
 * For short, single-line fields (title, author, language, publishedAtRaw).
 * Collapses all whitespace/newlines to a single space and truncates — these
 * fields are never expected to carry block-level HTML, only occasional bare
 * entity references (e.g. `&#246;`), which are decoded rather than
 * transliterated so original-language text (non-Latin scripts) is preserved.
 */
export function NormalizedTextSSchema<S extends number>(size: S) {
  return Schema.transform(
    Schema.String,
    Schema.String.pipe(
      Schema.maxLength(size),
      Schema.brand(`NormalizedText${size}` as const)
    ),
    {
      strict: true,
      decode: normalizeText(size),
      encode: normalizeText(size),
    }
  ).pipe(Html.decodeHtmlEntities())
}

function normalizeMarkdown(text: string) {
  return text
    .normalize('NFC')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * For fields that carry HTML from feed content (summary, content). Converts
 * HTML to Markdown (preserving paragraphs, lists, links, headings — and
 * decoding entities as part of that conversion) rather than collapsing to a
 * single line, and applies no length cap: slicing Markdown at a fixed
 * character count can truncate mid-syntax (mid-link, mid-emphasis marker)
 * and produce broken output. Downstream storage (`FactChecksTableDBSchema`)
 * types these fields as unconstrained `STRING`, so nothing depends on a cap.
 */
export const NormalizedMarkdownSchema = Schema.transform(
  Schema.String,
  Schema.String.pipe(Schema.brand('NormalizedMarkdown')),
  {
    strict: true,
    decode: normalizeMarkdown,
    encode: normalizeMarkdown,
  }
).pipe(Html.htmlToMarkdown())

export type NormalizedMarkdown = string & Brand.Brand<'NormalizedMarkdown'>
export const NormalizedMarkdownBrand =
  Brand.nominal<NormalizedMarkdown>()

const CONTENT_PREVIEW_MAX_LENGTH = 500

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const sliced = text.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  const trimmed = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced
  return `${trimmed}…`
}

/**
 * A short, plain-text preview of Markdown content, safe to store inline
 * even where the full Markdown (uncapped, via `NormalizedMarkdownSchema`)
 * would exceed a downstream document-size limit — the full text is stored
 * separately as a content-addressable blob (see `ContentBlob.ts`) and
 * referenced by `fact_check.sha256`. Plain text has no syntax left to
 * break, so truncating it (unlike Markdown) is safe.
 */
export function contentPreview(markdown: string): NormalizedMarkdown {
  return NormalizedMarkdownBrand(
    truncateAtWordBoundary(
      collapseWhitespace(stripMarkdown(markdown)),
      CONTENT_PREVIEW_MAX_LENGTH
    )
  )
}

export function NormalizedTextSBrand<S extends number>(_: S) {
  return Brand.nominal<string & Brand.Brand<`NormalizedText${S}`>>()
}

export type NormalizedTextS<S extends number> = string &
  Brand.Brand<`NormalizedText${S}`>

const sizes = {
  tiny: 64,
  small: 256,
  medium: 512,
  large: 1024,
  xl: 2048,
  xxl: 4096,
} as const

export const NormalizedTextTinySchema = NormalizedTextSSchema(sizes.tiny)
export type NormalizedTextTiny = NormalizedTextS<typeof sizes.tiny>
export const NormalizedTextTinyBrand = NormalizedTextSBrand(sizes.tiny)

export const NormalizedTextSmallSchema = NormalizedTextSSchema(sizes.small)
export type NormalizedTextSmall = NormalizedTextS<typeof sizes.small>
export const NormalizedTextSmallBrand = NormalizedTextSBrand(sizes.small)

export const NormalizedTextMediumSchema = NormalizedTextSSchema(sizes.medium)
export type NormalizedTextMedium = NormalizedTextS<typeof sizes.medium>
export const NormalizedTextMediumBrand = NormalizedTextSBrand(sizes.medium)

export const NormalizedTextLargeSchema = NormalizedTextSSchema(sizes.large)
export type NormalizedTextLarge = NormalizedTextS<typeof sizes.large>
export const NormalizedTextLargeBrand = NormalizedTextSBrand(sizes.large)

export const NormalizedTextXlSchema = NormalizedTextSSchema(sizes.xl)
export type NormalizedTextXl = NormalizedTextS<typeof sizes.xl>
export const NormalizedTextXlBrand = NormalizedTextSBrand(sizes.xl)

export const NormalizedTextXxlSchema = NormalizedTextSSchema(sizes.xxl)
export type NormalizedTextXxl = NormalizedTextS<typeof sizes.xxl>
export const NormalizedTextXxlBrand = NormalizedTextSBrand(sizes.xxl)
