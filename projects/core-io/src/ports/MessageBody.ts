/**
 * The transport-agnostic shape of a single message payload, shared by the
 * {@link MessageBatch} and {@link MessageQueue} ports.
 */
export interface MessageBody {
  /** Raw message bytes. */
  readonly data: Buffer
  /** Transport-level key/value metadata attached to the message, if any. */
  readonly attributes?: Record<string, string>
  /** Unique identifier for this message, as assigned by the transport. */
  readonly messageId: string
  /** Time the message was published/produced, as reported by the transport. */
  readonly publishTime: Date
}
