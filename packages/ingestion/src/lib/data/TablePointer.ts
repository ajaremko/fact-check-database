import { Schema } from 'effect'

/**
 * Schema for a reference to a specific table.
 *
 * Embedded in events and records to link their payloads to a specific table.
 */
export const TablePointerSchema = Schema.Struct({
  datasetId: Schema.String,
  tableId: Schema.String,
})

/** A reference to a specific table */
export type TablePointer = Schema.Schema.Type<typeof TablePointerSchema>
