import * as gcp from '@pulumi/gcp'

function assertPositiveWholeDays(key: string, value: number | undefined) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
    throw new Error(
      `ingestion:${key} must be a whole number of days, 1 or more. Got ${value}.`
    )
  }
}

/**
 * Builds the archive bucket's lifecycle rules from the two optional stack
 * settings. Each setting is an object age in days. An unset one adds no
 * rule, so with neither set the archive stays in Standard storage.
 *
 * The rules only ever change an object's storage class; nothing is deleted.
 * Each one matches only objects in a warmer class, so a rule can never move
 * an object back up. With only the Coldline age set, objects move straight
 * from Standard to Coldline.
 */
export function archiveLifecycleRules(input: {
  nearlineAfterDays: number | undefined
  coldlineAfterDays: number | undefined
}): gcp.types.input.storage.BucketLifecycleRule[] | undefined {
  const { nearlineAfterDays, coldlineAfterDays } = input
  assertPositiveWholeDays('archiveNearlineAfterDays', nearlineAfterDays)
  assertPositiveWholeDays('archiveColdlineAfterDays', coldlineAfterDays)
  if (
    nearlineAfterDays !== undefined &&
    coldlineAfterDays !== undefined &&
    coldlineAfterDays <= nearlineAfterDays
  ) {
    throw new Error(
      `ingestion:archiveColdlineAfterDays (${coldlineAfterDays}) must be greater than ingestion:archiveNearlineAfterDays (${nearlineAfterDays}).`
    )
  }

  const rules: gcp.types.input.storage.BucketLifecycleRule[] = []
  if (nearlineAfterDays !== undefined) {
    rules.push({
      action: { type: 'SetStorageClass', storageClass: 'NEARLINE' },
      condition: {
        age: nearlineAfterDays,
        matchesStorageClasses: ['STANDARD'],
      },
    })
  }
  if (coldlineAfterDays !== undefined) {
    rules.push({
      action: { type: 'SetStorageClass', storageClass: 'COLDLINE' },
      condition: {
        age: coldlineAfterDays,
        matchesStorageClasses: ['STANDARD', 'NEARLINE'],
      },
    })
  }
  return rules.length > 0 ? rules : undefined
}
