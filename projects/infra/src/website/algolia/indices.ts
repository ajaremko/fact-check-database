// eslint-disable-next-line @nx/enforce-module-boundaries
import * as algolia from '@pulumi/algolia'

import { stackName } from '../../config'
import { tag } from '../config'

export const factChecksIndex = new algolia.Index(`${tag}-fact-checks-index`, {
  name: `${tag}_fact_checks_${stackName}`,
  attributesConfig: {
    searchableAttributes: [
      'source_name',
      'title',
      'claim',
      'summary',
      'verdict',
      'published_at',
    ],
    attributesForFacetings: ['category'],
    unretrievableAttributes: ['fact_check_id'],
    attributesToRetrieves: [
      'source_name',
      'collection',
      'raw_published_at',
      'published_at',
      'title',
      'claim',
      'summary',
      'raw_verdict',
      'verdict',
      'language',
      'canonical_url',
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
