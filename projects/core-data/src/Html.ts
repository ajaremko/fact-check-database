import { decode as decodeEntities } from 'he'
import TurndownService from 'turndown'
import { ParseResult, Schema } from 'effect'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  emDelimiter: '_',
})

/**
 * Safety valve against pathologically large feed payloads driving up
 * conversion cost — not a content-shaping truncation. Chosen generously
 * relative to observed real-world feed sizes (low tens of KB).
 */
const MAX_HTML_INPUT_LENGTH = 500_000

function toMarkdown(input: string): string {
  const bounded =
    input.length > MAX_HTML_INPUT_LENGTH
      ? input.slice(0, MAX_HTML_INPUT_LENGTH)
      : input
  return turndownService.turndown(bounded)
}

/**
 * A schema combinator that converts an HTML string into Markdown text.
 *
 * Preserves paragraphs, lists, links, emphasis, and headings via `turndown`.
 * Plain (tag-free) input passes through as text with entities decoded.
 *
 * @example
 * const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
 * const result = decode('<p>Hello <a href="https://example.com">world</a></p>')
 * // → "Hello [world](https://example.com)"
 */
export function htmlToMarkdown() {
  return function <A extends string, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transformOrFail(Schema.String, schema, {
      strict: true,
      decode: (input, _, ast) =>
        ParseResult.try({
          try: () => toMarkdown(input),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
      encode: (input, _, ast) =>
        ParseResult.try({
          try: () => toMarkdown(input),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
    })
  }
}

/**
 * A schema combinator that decodes HTML/XML character references (e.g.
 * `&#246;`, `&amp;`) into their literal characters, without interpreting
 * any HTML tags.
 *
 * Intended for short, single-line fields that may carry a bare entity
 * reference but no markup — use `htmlToMarkdown` for fields that may
 * contain block-level HTML.
 *
 * @example
 * const decode = pipe(Schema.String, decodeHtmlEntities(), Schema.decodeSync)
 * const result = decode('Frank V&#246;hringer')
 * // → "Frank Vöhringer"
 */
export function decodeHtmlEntities() {
  return function <A extends string, R>(schema: Schema.Schema<A, string, R>) {
    return Schema.transformOrFail(Schema.String, schema, {
      strict: true,
      decode: (input, _, ast) =>
        ParseResult.try({
          try: () => decodeEntities(input),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
      encode: (input, _, ast) =>
        ParseResult.try({
          try: () => decodeEntities(input),
          catch: () => new ParseResult.Unexpected(ast, input),
        }),
    })
  }
}
