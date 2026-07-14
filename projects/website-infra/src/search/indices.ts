// eslint-disable-next-line @nx/enforce-module-boundaries
import * as algolia from '@pulumi/algolia'

import { stackName } from '../config'
import { tag } from '../config'

export const factChecksIndex = new algolia.Index(`${tag}-fact-checks-index`, {
  name: `${tag}_fact_checks_${stackName}`,
  deletionProtection: false,
  attributesConfig: {
    searchableAttributes: [
      'source_name',
      'title',
      'summary',
      'published_at_normalized',
    ],
    attributesForFacetings: [],
    unretrievableAttributes: [],
    attributesToRetrieves: [
      'ObjectID',
      'content_type',
      'content_length',
      'final_url',
      'extracted_at',
      'source_collection',
      'source_id',
      'source_url',
      'source_name',
      'canonical_url',
      'language',
      'link',
      'published_at_normalized',
      'published_at_raw',
      'summary',
      'title',
    ],
  },
  rankingConfig: {
    rankings: ['words', 'proximity'],
    customRankings: ['desc(published_at_raw)'],
  },
  facetingConfig: {
    maxValuesPerFacet: 50,
    sortFacetValuesBy: 'alpha',
  },
  // languagesConfig: {
  //   removeStopWordsFors: ['en'],
  // },
})

export const factChecksOldestIndex = new algolia.Index(
  `${tag}-fact-checks-oldest-index`,
  {
    name: `${tag}_fact_checks_oldest_${stackName}`,
    primaryIndexName: factChecksIndex.name,
    deletionProtection: false,
    rankingConfig: {
      customRankings: ['asc(published_at_raw)'],
    },
  }
)
