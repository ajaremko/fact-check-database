import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import { SourceListSchema } from './SourceList'

describe('SourceListSchema', () => {
  it('decodes sources with and without the optional settings', () => {
    const result = Schema.decodeUnknownSync(SourceListSchema)({
      defaults: { timeoutSeconds: 30 },
      sources: [
        {
          id: 'politifact',
          name: 'politifact.com',
          collection: 'rss',
          url: 'https://www.politifact.com/rss/factchecks/',
        },
        {
          id: 'leadstories',
          name: 'Lead Stories',
          collection: 'atom',
          url: 'https://leadstories.com/atom.xml',
          timeoutSeconds: 90,
          enabled: false,
          notes: 'Slow to respond',
        },
      ],
    })
    expect(result).toStrictEqual({
      defaults: { timeoutSeconds: 30 },
      sources: [
        {
          id: 'politifact',
          name: 'politifact.com',
          collection: 'rss',
          url: 'https://www.politifact.com/rss/factchecks/',
        },
        {
          id: 'leadstories',
          name: 'Lead Stories',
          collection: 'atom',
          url: 'https://leadstories.com/atom.xml',
          timeoutSeconds: 90,
          enabled: false,
          notes: 'Slow to respond',
        },
      ],
    })
  })

  it('rejects a list in which two sources share an id, naming the id', () => {
    expect(() =>
      Schema.decodeUnknownSync(SourceListSchema)({
        defaults: { timeoutSeconds: 30 },
        sources: [
          {
            id: 'factcheck',
            name: 'factcheck.org',
            collection: 'rss',
            url: 'https://www.factcheck.org/feed/',
          },
          {
            id: 'snopes',
            name: 'snopes.com',
            collection: 'rss',
            url: 'https://www.snopes.com/feed/',
          },
          {
            id: 'factcheck',
            name: 'factcheck.afp.com',
            collection: 'rss',
            url: 'https://factcheck.afp.com/rss.xml',
            enabled: false,
          },
        ],
      })
    ).toThrow('Source ids must be unique. Duplicated: factcheck')
  })

  it('rejects a timeout that is not a positive number', () => {
    expect(() =>
      Schema.decodeUnknownSync(SourceListSchema)({
        defaults: { timeoutSeconds: 0 },
        sources: [],
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SourceListSchema)({
        defaults: { timeoutSeconds: 30 },
        sources: [
          {
            id: 'snopes',
            name: 'snopes.com',
            collection: 'rss',
            url: 'https://www.snopes.com/feed/',
            timeoutSeconds: -5,
          },
        ],
      })
    ).toThrow()
  })

  it('rejects a document with no default timeout', () => {
    expect(() =>
      Schema.decodeUnknownSync(SourceListSchema)({ sources: [] })
    ).toThrow()
  })
})
