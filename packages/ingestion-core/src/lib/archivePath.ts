import { format } from 'date-fns'

/**
 * Formats a Unix timestamp (ms) as `yyyy-MM-dd` for use in archive partition paths.
 */
export function ymd(ms: number): string {
  return format(new Date(ms), 'yyyy-MM-dd')
}

/**
 * Constructs the partition segment shared by archive object paths:
 * `source={sourceName}/date={yyyy-MM-dd}/run={runId}`
 *
 * Used as the middle segment in both ingestor and sanitizer archive paths,
 * e.g. `records/source=example.com/date=2026-04-04/run={uuid}/{id}.yml`.
 */
export function archiveBaseDir(
  sourceName: string,
  fetchedAt: number,
  runId: string
): string {
  return `source=${sourceName}/date=${ymd(fetchedAt)}/run=${runId}`
}
