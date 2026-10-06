import { Array, Schema } from 'effect'

import { SourceConfigSchema } from './SourceConfig'

const TimeoutSecondsSchema = Schema.Number.pipe(Schema.positive())

/**
 * One entry of the source list: a source, plus optional settings for how
 * the ingestor fetches it. The settings are not part of the source's
 * identity and are not written to archived records, which carry
 * {@link SourceConfigSchema} alone.
 */
export const SourceListEntrySchema = Schema.Struct({
  ...SourceConfigSchema.fields,
  // Overrides `defaults.timeoutSeconds` for this source
  timeoutSeconds: Schema.optional(TimeoutSecondsSchema),
  // `false` keeps the source in the list without fetching it. Absent means
  // enabled
  enabled: Schema.optional(Schema.Boolean),
  // Free text for whoever maintains the list. Not used by the ingestor
  notes: Schema.optional(Schema.String),
})

export type SourceListEntry = Schema.Schema.Type<typeof SourceListEntrySchema>

/**
 * The ids that appear more than once in a list of sources, each named once.
 */
function duplicatedIds(sources: ReadonlyArray<{ readonly id: string }>) {
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  for (const { id } of sources) {
    if (seen.has(id)) duplicated.add(id)
    seen.add(id)
  }
  return Array.fromIterable(duplicated)
}

/**
 * The source list document: the sources the ingestor fetches, and the fetch
 * settings they share.
 *
 * Source ids must be unique, disabled sources included. An id names a
 * source's archive path and is part of every `fact_check_id`, so two sources
 * sharing one would overwrite each other's fetch records and merge their
 * fact checks.
 */
export const SourceListSchema = Schema.Struct({
  defaults: Schema.Struct({
    // Seconds a fetch may take before it is abandoned and recorded as failed
    timeoutSeconds: TimeoutSecondsSchema,
  }),
  sources: Schema.Array(SourceListEntrySchema),
}).pipe(
  Schema.filter(({ sources }) => {
    const duplicated = duplicatedIds(sources)
    return duplicated.length === 0
      ? undefined
      : `Source ids must be unique. Duplicated: ${duplicated.join(', ')}`
  })
)

export type SourceList = Schema.Schema.Type<typeof SourceListSchema>
