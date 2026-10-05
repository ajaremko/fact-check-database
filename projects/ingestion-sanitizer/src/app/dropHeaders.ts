/**
 * Removes the response headers the policy's `dropHeaders` list names, so
 * values such as session cookies are not copied into sanitizer records and
 * the rows extracted from them.
 *
 * HTTP header names are case-insensitive, so `Set-Cookie` is removed by a
 * `set-cookie` entry. Returns the headers that were kept and the names of
 * the ones that were dropped, as they appeared.
 */
export function dropHeaders(
  headers: Readonly<Record<string, string>>,
  names: ReadonlyArray<string>
): { headers: Record<string, string>; dropped: string[] } {
  const denied = new Set(names.map((name) => name.toLowerCase()))
  const kept: Record<string, string> = {}
  const dropped: string[] = []

  for (const [name, value] of Object.entries(headers)) {
    if (denied.has(name.toLowerCase())) {
      dropped.push(name)
    } else {
      kept[name] = value
    }
  }

  return { headers: kept, dropped }
}
