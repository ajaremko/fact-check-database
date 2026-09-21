# Known Issues

## `NEXT_PUBLIC_GA_MEASUREMENT_ID` is dead configuration

**Error:** No error — the env var currently has no effect.
**Where:** `.env.local` sets `NEXT_PUBLIC_GA_MEASUREMENT_ID`, but `src/lib/analytics/index.tsx`
hardcodes the same measurement ID (`G-3M9TMFJZZD`) directly in source instead of reading the env
var.
**Root cause:** Unknown — the two currently agree, so this has likely never been noticed.
**Decision:** Leave as-is rather than guess which is authoritative. Changing the env var today
silently does nothing; that's the only real consequence.
**If this ever needs to be fixed:** Change `src/lib/analytics/index.tsx` to read
`process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` instead of the hardcoded literal.

## `recaptcha-verify.ts` logs via `console` instead of Effect

**Error:** No error — a style inconsistency, not a functional bug.
**Where:** `src/lib/forms/recaptcha-verify.ts` uses `console.debug`/`console.log` directly. Every
other logging call in this codebase goes through `Effect.logInfo`/`Effect.logError`.
**Root cause:** This file is a plain (non-Effect) async function, called from
`recaptcha-effect.ts` via `Effect.tryPromise` — it sits one layer outside the Effect context, and
was likely never revisited after being wrapped.
**Decision:** Leave as-is. Threading a real logger through cleanly means either converting this
file to return an `Effect` or accepting a logging callback — a small refactor, not a one-line
change.
**If this ever needs to be fixed:** Convert `verifyRecaptchaToken`/`createAssessment` to Effects
(replacing the two `console` calls with `Effect.logDebug`), and have `recaptcha-effect.ts` compose
them directly instead of wrapping a promise.
