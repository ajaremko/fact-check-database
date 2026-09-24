import type { google } from '@google-cloud/pubsub/build/protos/protos'

/**
 * Converts a protobuf `Timestamp` into a `Date`, combining whole `seconds`
 * with the sub-second `nanos` remainder. Protobufjs types `seconds` as
 * `number | string | Long`, so it's normalized through its string form.
 * Missing fields are treated as zero.
 */
export function timestampToDate({
  seconds,
  nanos,
}: google.protobuf.ITimestamp): Date {
  const millis = Number(String(seconds ?? 0)) * 1000 + Number(nanos ?? 0) / 1e6
  return new Date(millis)
}
