import { Effect } from 'effect'

/**
 * Extracts the SDK's status code from a rejected call's `cause`, if it
 * carries one. Google clients expose it as `code` (gRPC or HTTP), Algolia
 * as `status`.
 */
function statusCode(cause: unknown): unknown {
  if (typeof cause !== 'object' || cause === null) {
    return undefined
  }
  if ('code' in cause) {
    return cause.code
  }
  if ('status' in cause) {
    return cause.status
  }
  return undefined
}

/**
 * Logs a debug entry when an SDK call fails, then lets the error continue.
 *
 * Only the error's tag and the SDK status code are annotated. The raw cause
 * is never logged, since SDK error messages can echo request contents.
 */
export function logSdkFailure(message: string) {
  return <A, E extends { readonly _tag: string; readonly cause: unknown }, R>(
    self: Effect.Effect<A, E, R>
  ) =>
    Effect.tapError(self, (error) => {
      const code = statusCode(error.cause)
      return Effect.logDebug(message).pipe(
        Effect.annotateLogs(
          code === undefined
            ? { 'error._tag': error._tag }
            : { 'error._tag': error._tag, 'cause.code': code }
        )
      )
    })
}
