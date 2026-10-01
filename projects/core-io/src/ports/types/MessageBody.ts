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
  /**
   * Which delivery of this message this is, starting at 1, when the transport
   * reports it. Pub/Sub sets it only for subscriptions with a dead-letter
   * policy, so a value above 1 marks a redelivery.
   */
  readonly deliveryAttempt?: number
}
