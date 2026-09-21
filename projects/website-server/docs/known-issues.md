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
