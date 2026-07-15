import removeMarkdown from 'remove-markdown'

/**
 * Strips Markdown formatting (links, emphasis, headings, lists, etc.) down
 * to plain text, keeping the underlying text content.
 *
 * A one-way derivation, not a schema combinator — there's no inverse
 * (plain text can't be turned back into the original Markdown), so this
 * isn't meaningful as a `Schema.transform` the way `Html.htmlToMarkdown` is.
 *
 * @example
 * stripMarkdown('A [link](https://example.com) and *bold* text')
 * // → "A link and bold text"
 */
export function stripMarkdown(text: string): string {
  return removeMarkdown(text)
}
