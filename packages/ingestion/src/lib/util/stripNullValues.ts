export function stripNullValues<T extends { [key: string]: unknown }>(
  obj: T
): {
  [k in keyof T]: null extends T[k] ? NonNullable<T[k]> | undefined : T[k]
} {
  const result: Partial<{ [k in keyof T]: T[k] }> = {}
  for (const key in obj) {
    if (obj[key] !== null) {
      result[key] = obj[key]
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any
}
