export type ExtractedRow = {
  observationId: string
  extractionId: string
  runId: string
  source: {
    name: string
    collection: string
  }
  url: string
  finalUrl: string
  publishedAt: Date
  fetchedAt: Date
  extractedAt: Date
  title: string
  claim: string
  verdict: 'true' | 'false' | 'misleading'
  summary?: string
}
