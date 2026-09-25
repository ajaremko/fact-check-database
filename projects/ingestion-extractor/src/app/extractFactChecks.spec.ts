import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'

import { extractFactChecks } from './extractFactChecks'

describe('extractFactChecks', () => {
  it.effect('when observation is safe, extracts array of claims', () =>
    Effect.gen(function* () {
      const storage = {
        'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.sanitize.yml': `
          version: 1
          kind: sanitized_record
          ingestor_run_id: d8af0771-64e4-4e86-99ba-000c6550d2de
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
              object: tmp/archive/v1/records/source=politifact.com/date=2026-04-29/ingestor_run_id=d8af0771-64e4-4e86-99ba-000c6550d2de/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.ingestion.yml
            raw:
              bucket: local
              object: tmp/archive/v1/raw/source=politifact.com/date=2026-04-29/ingestor_run_id=d8af0771-64e4-4e86-99ba-000c6550d2de/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.bin
          label: SAFE_PUBLIC
          actions: []
          bytes_rewritten: false
          http:
            status_code: 200
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
        extractorRunId: 'run-1',
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
          fact_check_id:
            '697166d61ebb1ebff3319d16eda9578e7ca1dfb388e9c4d654b9c7d6a1672ab3',
          content_sha256:
            '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
          extracted_at: '1970-01-01T00:00:00.000Z',
          extractor_run_id: 'run-1',
          extractor_id: 'rss',
          extractor_version: '1',
          fetched_at: '1970-01-01T00:00:00.000Z',
          ingestor_run_id: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
          fact_check: {
            canonical_url:
              'http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/',
            guid: 'http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/',
            language: 'en',
            link: 'http://www.politifact.com/factchecks/2026/apr/29/ron-desantis/florida-redistricting-republican-democrat-majority/',
            published_at_normalized: '2026-04-29T16:20:04.000Z',
            published_at_raw: 'Wed, 29 Apr 2026 16:20:04 +0000',
            sha256:
              'a5083d02d4e0e0a8f99d12fba822cc0f6bc71cd83a8c9b158b4b6e8c4cfa7baa',
            summary:
              'Since the 2020 census, Florida has "moved from a Democrat majority to a 1.5 million Republican advantage."',
            title:
              'Ron DeSantis - Florida redistricting: DeSantis overstates voters’ shift from Democrats to Republicans',
          },
          http: {
            content_type: 'application/rss+xml; charset=utf-8',
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status_code: 200,
          },
        },
        {
          fact_check_id:
            '3e2b4197e10c50dbee4af1193ee834e48678c06efdd2e7b60be68b334099f190',
          content_sha256:
            '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
          extracted_at: '1970-01-01T00:00:00.000Z',
          extractor_run_id: 'run-1',
          extractor_id: 'rss',
          extractor_version: '1',
          fetched_at: '1970-01-01T00:00:00.000Z',
          ingestor_run_id: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          fact_check: {
            canonical_url:
              'http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/',
            guid: 'http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/',
            language: 'en',
            link: 'http://www.politifact.com/article/2026/apr/28/missing-dead-scientists-nuclear-weapons-ufos/',
            published_at_normalized: '2026-04-28T22:38:37.000Z',
            published_at_raw: 'Tue, 28 Apr 2026 22:38:37 +0000',
            sha256:
              'bf42f8ac30fc5dcea481f971bc2a9ed4c1e58ca61c67e11392063e4f16b64552',
            summary: 'Fact-checking claims about missing and dead scientists',
            title: `Fact-checking claims about missing, dead scientists: Were they researching UFOs, nuclear weapons?`,
          },
          http: {
            content_type: 'application/rss+xml; charset=utf-8',
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status_code: 200,
          },
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
        },
        {
          fact_check_id:
            'b1633795a4ece36c6c34716b7cac0e1e694857903b7de32cf65f7a97de08910b',
          content_sha256:
            '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
          ingestor_run_id: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
          extracted_at: '1970-01-01T00:00:00.000Z',
          extractor_run_id: 'run-1',
          extractor_id: 'rss',
          extractor_version: '1',
          fetched_at: '1970-01-01T00:00:00.000Z',
          source: {
            collection: 'rss',
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
          fact_check: {
            canonical_url:
              'http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/',
            guid: 'http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/',
            language: 'en',
            link: 'http://www.politifact.com/article/2026/apr/27/Florida-drought-hurricane-season-active/',
            published_at_normalized: '2026-04-27T21:14:57.000Z',
            published_at_raw: 'Mon, 27 Apr 2026 21:14:57 +0000',
            sha256:
              'b4702ac341d644a67c43cd00170d4689c66aa76ebd2f059bc57200542845f95b',
            summary: 'What Florida’s drought means for hurricane season',
            title:
              'DeSantis said Florida’s drought could bring a quieter hurricane season. Is that true?',
          },
          http: {
            content_type: 'application/rss+xml; charset=utf-8',
            headers: {
              'cache-control': 'public, max-age=3600',
              connection: 'keep-alive',
              'content-length': '10648',
              'content-type': 'application/rss+xml; charset=utf-8',
              date: 'Wed, 29 Apr 2026 20:35:08 GMT',
              'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            },
            last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
            status_code: 200,
          },
        },
      ])
    })
  )
  it.effect(
    'writes full Markdown content to blob storage and stores a plain-text preview in the row',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'content-blob-test.sanitize.yml': `
          version: 1
          kind: sanitized_record
          ingestor_run_id: ing-1
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
            status_code: 200
            content_type: application/rss+xml
          content:
            sha256: content-blob-test-sha256
            bytes: 1
            sanitized:
              bucket: local
              object: content-blob-test.bin`,
          'content-blob-test.bin': `
          <?xml version="1.0" encoding="utf-8"?>
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <link>http://example.com/</link>
              <description>Test feed</description>
              <language>en</language>
              <item>
                <title>Item with full content</title>
                <link>http://example.com/item-1</link>
                <guid>http://example.com/item-1</guid>
                <description>Short summary</description>
                <content:encoded><![CDATA[<p>A <a href="https://example.com">link</a> and <strong>bold</strong> text.</p>]]></content:encoded>
                <pubDate>Wed, 29 Apr 2026 16:20:04 +0000</pubDate>
              </item>
            </channel>
          </rss>`,
        }
        const result = yield* extractFactChecks({
          extractorRunId: 'run-1',
          extractedAt: 0,
          pointer: {
            bucket: 'inmemory',
            object: 'content-blob-test.sanitize.yml',
          },
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toHaveLength(1)

        // The row stores a short plain-text preview, not the full Markdown.
        expect(result[0].fact_check.content).toBe('A link and bold text.')

        // The full Markdown (with intact link/emphasis syntax — this also
        // guards against the Html.ts encode-direction regression) is
        // written to a content-addressable blob keyed by fact_check.sha256.
        expect(
          storage[
            'v1/type=fact_checks_content/sha256=5802ab4c435b26ba50e3ae12b31138d79a5fcec5aac181f99c694288a2871553.md'
          ]
        ).toBe('A [link](https://example.com) and **bold** text.')
      })
  )
  it.effect('when observation is quarantined, returns an empty array', () =>
    Effect.gen(function* () {
      const storage = {
        '8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.sanitize.yml': `
          version: 1
          kind: sanitized_record
          ingestor_run_id: d8af0771-64e4-4e86-99ba-000c6550d2de
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
              object: tmp/archive/v1/records/source=africacheck.org/date=2026-04-29/ingestor_run_id=d8af0771-64e4-4e86-99ba-000c6550d2de/8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.ingestion.yml
            raw:
              bucket: local
              object: tmp/archive/v1/raw/source=africacheck.org/date=2026-04-29/ingestor_run_id=d8af0771-64e4-4e86-99ba-000c6550d2de/8ca9078baa5189bd08868c5fcefcf0eefdc9077ac0fbbb3f7ca88852f44e18e4.bin
          error: "Unexpected content-type: text/html; charset=UTF-8"
          label: QUARANTINED
          actions:
            - QUARANTINED_UNEXPECTED_CONTENT_TYPE
          bytes_rewritten: false
          http:
            status_code: 403
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
        extractorRunId: 'run-1',
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
            ingestor_run_id: ing-1
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
              status_code: 200
              content_type: application/rss+xml`,
        }
        const result = yield* extractFactChecks({
          extractorRunId: 'run-1',
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
