// An enum's default is its first member, which the Cloud Monitoring API names
// `<ENUM>_UNSPECIFIED` (for example `TARGET_AXIS_UNSPECIFIED`).
const isUnspecifiedEnum = (value: unknown): boolean =>
  typeof value === 'string' && value.endsWith('_UNSPECIFIED')

const isDefaultValue = (value: unknown): boolean =>
  value === 0 ||
  value === false ||
  value === '' ||
  isUnspecifiedEnum(value) ||
  (Array.isArray(value) && value.length === 0)

/**
 * Removes every property left at its default value (`0`, `false`, `''`, an
 * `_UNSPECIFIED` enum member or an empty array) from a dashboard definition.
 *
 * Cloud Monitoring stores a dashboard without these properties, and Pulumi
 * compares the definition in code with the stored one. Sending them makes every
 * preview report the dashboard as changed when nothing is. Empty objects are
 * kept: Cloud Monitoring keeps an object that was set.
 */
export const omitDefaultValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitDefaultValues)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, property]) => !isDefaultValue(property))
        .map(([key, property]) => [key, omitDefaultValues(property)])
    )
  }
  return value
}
