import type { SourceCollectionConfig } from '@news-research/ingestion-contracts/config/v1'

import { AtomExtractor } from './AtomExtractor'
import { RssExtractor } from './RssExtractor'
import type { ExtractionStrategy } from './ExtractionStrategy'

export const extractors = {
  atom: AtomExtractor,
  rss: RssExtractor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<SourceCollectionConfig, ExtractionStrategy<any, any>>
