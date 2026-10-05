// An ampersand between two parameters, as it appears in a URL taken from
// feed text: bare, or written as an XML/HTML entity (`&amp;`, `&#038;`,
// `&#x26;`). A feed that carries escaped HTML escapes it a second time
// (`&amp;amp;`, `&amp;#038;`), so any run of `amp;` belongs to the separator.
const separator = /(&(?:amp;)*(?:#0*38;|#x0*26;)?)/i

// The `#` that starts a fragment, as opposed to the one inside `&#038;`.
const fragmentStart = /(?<!&(?:amp;)*)#/

// A URL inside feed text. It ends at whitespace, a quote, an angle bracket,
// the `]]>` that closes a CDATA section, or an entity other than an
// ampersand (`&quot;` closing an escaped attribute, for example). Whitespace
// is listed character by character because the text is Latin-1 decoded
// bytes: `\s` also matches 0xA0, which is half of a multi-byte character in
// a UTF-8 URL.
const urlInText =
  /https?:\/\/(?:[^ \t\n\r\f\v"'<>&\]]|\](?!\]>)|&(?:amp;)*(?:#0*38;|#x0*26;)|&(?:amp;)*(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);))+/gi

// Punctuation that ends the sentence or bracket a URL sits in, not the URL.
const trailingPunctuation = /[.,!:)]+$/

function isListed(parameter: string, patterns: ReadonlyArray<string>) {
  const name = parameter.split('=', 1)[0].toLowerCase()
  if (name === '') return false
  return patterns.some((entry) => {
    const pattern = entry.toLowerCase()
    return pattern.endsWith('_') ? name.startsWith(pattern) : name === pattern
  })
}

/**
 * Removes the query parameters the policy's `stripQueryParams` list names
 * from one URL. Tracking parameters such as `utm_source` say how a reader
 * reached an article, not which article it is, so they are removed before
 * the URL is used as an identifier.
 *
 * An entry is a parameter name, matched case-insensitively. An entry ending
 * in `_` is a prefix: `utm_` matches `utm_source` and `utm_medium`.
 *
 * Everything else is kept as written: the other parameters, their order and
 * separators, and the fragment. When no parameter is left the `?` is removed
 * too. A URL with nothing to remove is returned unchanged.
 */
export function stripQueryParams(
  url: string,
  patterns: ReadonlyArray<string>
): string {
  const fragmentIndex = url.search(fragmentStart)
  const beforeFragment =
    fragmentIndex === -1 ? url : url.slice(0, fragmentIndex)
  const fragment = fragmentIndex === -1 ? '' : url.slice(fragmentIndex)

  const queryIndex = beforeFragment.indexOf('?')
  if (queryIndex === -1) return url

  // Alternates parameter, separator, parameter, ...
  const parts = beforeFragment.slice(queryIndex + 1).split(separator)
  const kept: string[] = []
  let removed = false
  for (let i = 0; i < parts.length; i += 2) {
    if (isListed(parts[i], patterns)) {
      removed = true
      continue
    }
    // A kept parameter keeps the separator written before it, unless it is
    // now the first parameter.
    if (kept.length > 0) kept.push(parts[i - 1])
    kept.push(parts[i])
  }
  if (!removed) return url

  const query = kept.join('')
  return (
    beforeFragment.slice(0, queryIndex) +
    (query === '' ? '' : `?${query}`) +
    fragment
  )
}

/**
 * Applies {@link stripQueryParams} to every `http(s)://` URL in `text`, and
 * reports how many URLs changed. Nothing outside those URLs is touched.
 *
 * `text` is a feed body: XML whose URLs appear in elements, attributes,
 * CDATA sections and escaped HTML.
 */
export function stripQueryParamsInText(
  text: string,
  patterns: ReadonlyArray<string>
): { text: string; urlsChanged: number } {
  let urlsChanged = 0
  const result = text.replace(urlInText, (match) => {
    const trailing = trailingPunctuation.exec(match)?.[0] ?? ''
    const url = match.slice(0, match.length - trailing.length)
    const stripped = stripQueryParams(url, patterns)
    if (stripped === url) return match
    urlsChanged += 1
    return stripped + trailing
  })
  return { text: result, urlsChanged }
}
