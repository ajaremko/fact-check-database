export interface MessageBody {
  readonly data: Buffer
  readonly attributes?: Record<string, string>
  readonly messageId: string
  readonly publishTime: Date
}
