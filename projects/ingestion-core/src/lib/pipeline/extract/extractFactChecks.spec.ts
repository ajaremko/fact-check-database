import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageReader, InMemoryStorageWriter } from '../shared'

import { extractFactChecks } from './extractFactChecks'
import { version } from 'os'

describe('extractFactChecks', () => {
  it.effect('when observation is safe, extracts array of claims', () =>
    Effect.gen(function* () {
      const storage = {
        'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.sanitize.yml': `
          version: 1
          kind: sanitized_record
          content_lineage_id: b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb
          ingestion_batch_id: d8af0771-64e4-4e86-99ba-000c6550d2de
          fetched_at: 0
          sanitized_at: 0
          source:
            id: politifact
            name: politifact.com
            url: https://www.politifact.com/rss/all/
            collection: rss
          input:
            record:
              bucket: local
              object: tmp/archive/v1/records/source=politifact.com/date=2026-04-29/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.ingestion.yml
            raw:
              bucket: local
              object: tmp/archive/v1/raw/source=politifact.com/date=2026-04-29/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.bin
          label: SAFE_PUBLIC
          actions: []
          bytes_rewritten: false
          http:
            status: 200
            content_type: application/rss+xml; charset=utf-8
            last_modified: Wed, 29 Apr 2026 16:20:04 GMT
            headers:
              date: Wed, 29 Apr 2026 20:35:08 GMT
              content-type: application/rss+xml; charset=utf-8
              content-length: "10648"
              connection: keep-alive
              last-modified: Wed, 29 Apr 2026 16:20:04 GMT
              cache-control: public, max-age=3600
          content:
            sha256: 311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6
            bytes: 10648
            sanitized:
              bucket: local
              object: b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.bin`,
        'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.bin': `
          <?xml version="1.0" encoding="utf-8"?>
          <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
            <channel>
              <title>PolitiFact - Rulings and Stories</title>
              <link>http://www.politifact.com/</link>
              <description>The latest factchecks PolitiFact.com has reviewed</description>
              <atom:link href="http://www.politifact.com/rss/all/" rel="self"></atom:link>
              <language>en</language>
              <lastBuildDate>Wed, 29 Apr 2026 16:20:04 +0000</lastBuildDate>
              <item>
                <title>Ron DeSantis - Florida redistricting: DeSantis overstates voters’ shift from Democrats
                  to Republicans</title>
                <link>
                  http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/</link>
                <description>Since the 2020 census, Florida has "moved from a Democrat majority to a 1.5
                  million Republican advantage."</description>
                <pubDate>Wed, 29 Apr 2026 16:20:04 +0000</pubDate>
                <guid>
                  http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/</guid>
              </item>
              <item>
                <title>Fact-checking claims about missing, dead scientists: Were they researching UFOs,
                  nuclear weapons?</title>
                <link>
                  http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/</link>
                <description>Fact-checking claims about missing and dead scientists</description>
                <pubDate>Tue, 28 Apr 2026 22:38:37 +0000</pubDate>
                <guid>
                  http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/</guid>
              </item>
              <item>
                <title>DeSantis said Florida’s drought could bring a quieter hurricane season. Is that true?</title>
                <link>http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/</link>
                <description>What Florida’s drought means for hurricane season</description>
                <pubDate>Mon, 27 Apr 2026 21:14:57 +0000</pubDate>
                <guid>http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/</guid>
              </item>
            </channel>
          </rss>`,
      }
      const result = yield* extractFactChecks({
        extractionId: 'run-1',
        observationId:
          'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
        extractedAt: 0,
        pointer: {
          bucket: 'inmemory',
          object:
            'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.sanitize.yml',
        },
      }).pipe(
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage))
      )
      expect(result).toStrictEqual([
        {
          extractedAt: 0,
          extractionId: 'run-1',
          extractor: {
            id: 'rss',
            version: 1,
          },
          factCheck: {
            canonicalUrl: null,
            claim:
              "Ron DeSantis - Florida redistricting: DeSantis overstates voters' shift from Democrats to Republicans",
            extractedFrom: null,
            link: 'http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/',
            normalizedVerdict: null,
            publishedAtRaw: 'Wed, 29 Apr 2026 16:20:04 +0000',
            publishedAtNormalized: null,
            sha256:
              '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
            summary:
              'Since the 2020 census, Florida has "moved from a Democrat majority to a 1.5 million Republican advantage."',
            title:
              "Ron DeSantis - Florida redistricting: DeSantis overstates voters' shift from Democrats to Republicans",
            verdict: null,
          },
          fetchedAt: 0,
          http: {
            contentSha256:
              '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
            contentType: 'application/rss+xml; charset=utf-8',
            etag: null,
            finalUrl: null,
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status: 200,
          },
          id: '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
          ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          observationId:
            'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
        },
        {
          extractedAt: 0,
          extractionId: 'run-1',
          extractor: {
            id: 'rss',
            version: 1,
          },
          factCheck: {
            canonicalUrl: null,
            claim: `Fact-checking claims about missing, dead scientists: Were they researching UFOs, nuclear weapons?`,
            extractedFrom: null,
            link: 'http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/',
            normalizedVerdict: null,
            publishedAtRaw: 'Tue, 28 Apr 2026 22:38:37 +0000',
            publishedAtNormalized: null,
            sha256:
              'b57bd898c37fb7c83370fd211b5cc39502722446a7b0df7e1be464ff0b180eb6',
            summary: 'Fact-checking claims about missing and dead scientists',
            title: `Fact-checking claims about missing, dead scientists: Were they researching UFOs, nuclear weapons?`,
            verdict: null,
          },
          fetchedAt: 0,
          http: {
            contentSha256:
              '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
            contentType: 'application/rss+xml; charset=utf-8',
            etag: null,
            finalUrl: null,
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status: 200,
          },
          id: 'b57bd898c37fb7c83370fd211b5cc39502722446a7b0df7e1be464ff0b180eb6',
          ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          observationId:
            'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
        },
        {
          extractedAt: 0,
          extractionId: 'run-1',
          extractor: {
            id: 'rss',
            version: 1,
          },
          factCheck: {
            canonicalUrl: null,
            claim:
              "DeSantis said Florida's drought could bring a quieter hurricane season. Is that true?",
            extractedFrom: null,
            link: 'http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/',
            normalizedVerdict: null,
            publishedAtRaw: 'Mon, 27 Apr 2026 21:14:57 +0000',
            publishedAtNormalized: null,
            sha256:
              '61aa2ee326e48ce2dace6aee2ba72ccf85d32d2030bfa68694d3d9d151121852',
            summary: "What Florida's drought means for hurricane season",
            title:
              "DeSantis said Florida's drought could bring a quieter hurricane season. Is that true?",
            verdict: null,
          },
          fetchedAt: 0,
          http: {
            contentSha256:
              '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
            contentType: 'application/rss+xml; charset=utf-8',
            etag: null,
            finalUrl: null,
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status: 200,
          },
          id: '61aa2ee326e48ce2dace6aee2ba72ccf85d32d2030bfa68694d3d9d151121852',
          ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          observationId:
            'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
        },
      ])
    })
  )
  it.effect('when observation is quarantined, returns an empty array', () =>
    Effect.gen(function* () {
      const storage = {
        '8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.sanitize.yml': `
          version: 1
          kind: sanitized_record
          content_lineage_id: 8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4
          ingestion_batch_id: d8af0771-64e4-4e86-99ba-000c6550d2de
          fetched_at: 1777494908250
          sanitized_at: 1777494924164
          source:
            id: africacheck
            name: africacheck.org
            url: https://africacheck.org/feed
            collection: rss
          input:
            record:
              bucket: local
              object: tmp/archive/v1/records/source=africacheck.org/date=2026-04-29/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.ingestion.yml
            raw:
              bucket: local
              object: tmp/archive/v1/raw/source=africacheck.org/date=2026-04-29/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.bin
          error: "Unexpected content-type: text/html; charset=UTF-8"
          label: QUARANTINED
          actions:
            - QUARANTINED_UNEXPECTED_CONTENT_TYPE
          bytes_rewritten: false
          http:
            status: 403
            content_type: text/html; charset=UTF-8
            headers:
              date: Wed, 29 Apr 2026 20:35:08 GMT
              content-type: text/html; charset=UTF-8
              content-length: "5503"
              connection: close
              referrer-policy: same-origin
          content:
            sha256: 129e6946e76c261a50e3a7d73a1f6de750d4ed4a9c159d65a84654c75f310937
            bytes: 5503
            sanitized:
              bucket: local
              object: 8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.bin`,
      }
      const result = yield* extractFactChecks({
        extractionId: 'run-1',
        observationId:
          '8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4',
        extractedAt: 0,
        pointer: {
          bucket: 'inmemory',
          object:
            '8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.sanitize.yml',
        },
      }).pipe(
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage))
      )
      expect(result).toStrictEqual([])
    })
  )

  it.effect(
    'when observation is SAFE_PUBLIC but has no content, returns an empty array',
    () =>
      Effect.gen(function* () {
        const storage = {
          'no-content.sanitize.yml': `
            version: 1
            kind: sanitized_record
            content_lineage_id: no-content-obs
            ingestion_batch_id: ing-1
            fetched_at: 0
            sanitized_at: 0
            source:
              id: politifact
              name: politifact.com
              url: https://www.politifact.com/rss/all/
              collection: rss
            input:
              record:
                bucket: local
                object: record.yml
            label: SAFE_PUBLIC
            actions: []
            http:
              status: 200
              content_type: application/rss+xml`,
        }
        const result = yield* extractFactChecks({
          extractionId: 'run-1',
          observationId: 'no-content-obs',
          extractedAt: 0,
          pointer: { bucket: 'inmemory', object: 'no-content.sanitize.yml' },
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )
        expect(result).toStrictEqual([])
      })
  )
})
