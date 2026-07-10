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
      'claim',
      'summary',
      'verdict_normalized',
      'verdict_raw',
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
      'claim',
      'language',
      'link',
      'published_at_normalized',
      'published_at_raw',
      'summary',
      'title',
      'verdict_normalized',
      'verdict_raw',
    ],
  },
  rankingConfig: {
    rankings: ['words', 'proximity'],
  },
  facetingConfig: {
    maxValuesPerFacet: 50,
    sortFacetValuesBy: 'alpha',
  },
  // languagesConfig: {
  //   removeStopWordsFors: ['en'],
  // },
})
