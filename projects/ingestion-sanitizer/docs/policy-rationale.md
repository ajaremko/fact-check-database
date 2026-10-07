# Sanitizer Policy Rationale

Why the sanitizer's policy has the values it has. The [runbook](./runbook.md) documents the
policy's format and how to change it safely. This document records the reasoning behind each
value, so that a proposed change can be judged against the original intent.

## What the policy governs

The policy decides three things for every fetched response:

- whether downstream stages may use it (the label);
- which response headers are kept in the record;
- which query parameters are removed from URLs.

It does not decide which sources are fetched. That is the source list's job.

The policy exists as three files, kept identical. They sit together in
[`config/`](../../../config/README.md):

| File                                | Used by                                        |
| ----------------------------------- | ---------------------------------------------- |
| `config/sanitizer-policy.local.yml` | Local development                              |
| `config/sanitizer-policy.dev.yml`   | The dev sanitizer, served from Secret Manager  |
| `config/sanitizer-policy.prod.yml`  | The prod sanitizer, served from Secret Manager |

Dev and prod are identical on purpose. Dev exists to show what prod will do. A policy that
differed between them would label the same response differently, and would give the same fact
check a different id in each environment.

## Evidence

Where a value rests on a measurement, the figure comes from the dev archive:

- **Responses:** all 1,677 fetch records written from 1 to 5 October 2026, across 32 ingestor
  runs.
- **Feed bodies:** the 52 bodies of one ingestor run on 5 October 2026, which contain 2,074 item
  links.

These are snapshots. They show that a value fits the feeds as they were on those dates. Measure
again before relying on them for a new decision.

## `dropHeaders`

```yaml
dropHeaders: [set-cookie, cookie, authorization]
```

**Why these three.** They carry credentials or session state, not information about the
content.

- `set-cookie` is a session identifier that a publisher's server or CDN issues to the crawler.
- `cookie` and `authorization` are request headers and should not appear in a response. They are
  listed so that a server which echoes request headers back cannot put a credential into a
  record.

**Why remove them.** A fetch record keeps the response headers as provenance, and the extractor
copies them into every row it writes. A session identifier has no research value and should not
be passed on with the dataset. 273 of the 1,677 responses (16%) carried `set-cookie`.

**Why a denylist and not an allowlist.** The other headers, such as `etag`, `last-modified` and
`cache-control`, describe how and when the content was served. That is provenance a researcher
can use. An allowlist would discard every header nobody thought to list. The denylist names what
must not be kept and leaves the rest. Its cost is the reverse: a credential-bearing header that
nobody has listed is kept.

## `stripQueryParams`

### Why strip query parameters

- **Identity.** A fact check's id is a hash of its source and its article URL. A link ending in
  `?utm_source=rss` and the same link without it would be two fact checks. Tracking parameters
  say how a reader arrived, not which article it is.
- **Privacy.** Identifiers such as `fbclid` are issued per click or per reader. They enter an
  article when its author pastes a link they followed. `pnespid`, for example, identifies one
  newsletter subscriber. They should not be passed on with the dataset.

### The selection rule

A parameter is listed only if all three hold:

1. **It identifies a click, a reader or a campaign, never the content.** The URL without it
   leads to the same page.
2. **Its name is distinctive.** No site uses the same name to select a page.
3. **It has a stated basis**, one of:
   - it is on the list Firefox ships for its own query stripping;
   - it appears in our feeds;
   - it is the sibling of an entry that meets one of those: the same platform's parameter for
     the same purpose.

### The list

The basis column uses these terms:

- **Firefox:** on Firefox's strip list (Mozilla Remote Settings, collection `query-stripping`,
  read on 5 October 2026).
- **Feeds:** seen in the 52 feed bodies, with the number of URLs and the number of feeds.
- **Sibling:** listed with a related entry, and not seen in our feeds.

An entry ending in `_` is a prefix. See [Prefix entries](#prefix-entries).

| Entry                        | Platform       | What it is                                                            | Basis                                    |
| ---------------------------- | -------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `utm_`                       | Campaign tags  | `utm_source`, `utm_medium`, `utm_campaign` and the rest of the family | Feeds: 171 URLs in 20 feeds              |
| `mtm_`                       | Campaign tags  | Matomo's equivalent of the `utm_` family                              | Sibling of `utm_`                        |
| `gclid`                      | Google         | Google Ads click id                                                   | Firefox. Feeds: 5 URLs in 4 feeds        |
| `gclsrc`                     | Google         | Marker that accompanies `gclid`                                       | Sibling of `gclid`                       |
| `gbraid`                     | Google         | Google Ads click id used for iOS measurement                          | Firefox. Feeds: 2 URLs in 1 feed         |
| `wbraid`                     | Google         | Google Ads click id used for iOS measurement                          | Firefox                                  |
| `dclid`                      | Google         | Click id from Google's display advertising                            | Firefox                                  |
| `gad_`                       | Google         | Google Ads campaign markers: `gad_source`, `gad_campaignid`           | Feeds: 3 URLs in 2 feeds                 |
| `srsltid`                    | Google         | Id Google Search adds to links it sends readers to                    | Feeds: 3 URLs in 2 feeds                 |
| `_gl`                        | Google         | Google Analytics value that links a visit across domains              | Feeds: 1 URL in 1 feed                   |
| `_ga`                        | Google         | Older form of `_gl`                                                   | Sibling of `_gl`                         |
| `g_ep`                       | Google         | Opaque token on Google's own Maps and Search links                    | Feeds: 32 URLs in 8 feeds                |
| `fbclid`                     | Meta           | Facebook click id                                                     | Firefox. Feeds: 32 URLs in 7 feeds       |
| `mibextid`                   | Meta           | Id on links shared from the Facebook mobile app                       | Feeds: 21 URLs in 5 feeds                |
| `rdid`                       | Meta           | Id on Facebook share links                                            | Feeds: 18 URLs in 7 feeds                |
| `__tn__`                     | Meta           | Facebook click-tracking token                                         | Feeds: 30 URLs in 6 feeds                |
| `__cft__`                    | Meta           | Facebook click-tracking token, written `__cft__[0]`                   | Feeds: 20 URLs in 5 feeds                |
| `igsh`                       | Meta           | Instagram share id                                                    | Feeds: 1 URL in 1 feed                   |
| `igshid`                     | Meta           | Older form of `igsh`                                                  | Sibling of `igsh`                        |
| `msclkid`                    | Microsoft      | Microsoft Advertising click id                                        | Firefox                                  |
| `msockid`                    | Microsoft      | Id Bing adds to links it sends readers to                             | Feeds: 10 URLs in 1 feed                 |
| `twclid`                     | X / Twitter    | X Ads click id                                                        | Firefox                                  |
| `ref_src`                    | X / Twitter    | Marker on links inside embedded posts                                 | Feeds: 77 URLs in 12 feeds               |
| `ref_url`                    | X / Twitter    | The page an embedded post was shown on                                | Feeds: 1 URL in 1 feed                   |
| `ttclid`                     | TikTok         | TikTok Ads click id                                                   | Sibling: the same kind of id as `fbclid` |
| `li_fat_id`                  | LinkedIn       | LinkedIn Ads click id                                                 | Sibling: the same kind of id as `fbclid` |
| `yclid`, `ysclid`            | Yandex         | Yandex click ids                                                      | Firefox                                  |
| `_openstat`                  | Yandex         | Yandex campaign marker                                                | Firefox                                  |
| `mc_eid`                     | Mailchimp      | Subscriber id in newsletter links                                     | Firefox                                  |
| `mc_cid`                     | Mailchimp      | Campaign id in newsletter links                                       | Sibling of `mc_eid`                      |
| `_hsenc`                     | HubSpot        | Encoded recipient of a marketing email                                | Firefox                                  |
| `_hsmi`                      | HubSpot        | Id of the marketing email                                             | Sibling of `_hsenc`                      |
| `__hssc`, `__hstc`, `__hsfp` | HubSpot        | Visitor-tracking values                                               | Firefox                                  |
| `hsctatracking`              | HubSpot        | Click id of a call-to-action button                                   | Firefox                                  |
| `mkt_tok`                    | Marketo        | Subscriber token in marketing emails                                  | Firefox                                  |
| `oly_anon_id`, `oly_enc_id`  | Omeda          | Subscriber ids in newsletter links                                    | Firefox                                  |
| `vero_id`                    | Vero           | Subscriber id in marketing emails                                     | Firefox                                  |
| `__s`                        | Drip           | Subscriber id in marketing emails                                     | Firefox                                  |
| `wickedid`                   | Wicked Reports | Click id                                                              | Firefox                                  |
| `pnespid`                    | Piano          | Newsletter subscriber id                                              | Feeds: 1 URL in 1 feed                   |
| `guccounter`                 | Yahoo          | Counter Yahoo's consent page adds when it redirects                   | Feeds: 4 URLs in 4 feeds                 |
| `guce_`                      | Yahoo          | `guce_referrer` and its signature: the page the reader came from      | Feeds: 3 URLs in 3 feeds                 |

The entries with the weakest basis are the siblings. None has been seen in a feed, and `ttclid`
and `li_fat_id` are not siblings of a listed parameter in the strict sense: they are the click
ids of two more advertising platforms. They are listed because each is as distinctive as
`fbclid`, so listing them is unlikely to remove a parameter a site needs.

### Prefix entries

Six entries end in `_` and so match every parameter that starts with them.

- `utm_`, `mtm_`, `gad_` and `guce_` name families. Listing the prefix covers members that a
  platform adds later.
- `__cft__` is a prefix because Facebook writes the parameter as `__cft__[0]`.
- `__tn__` is a prefix only because its name ends in `_`. It matches itself.

A prefix is a wider promise than a name: it says no parameter starting with it will ever select
a page. Add one only for a family a single platform owns.

### What was left out

These parameters are in the feeds and are tracking on some sites. They are not listed, because
their names fail the second rule.

| Parameter                  | URLs in the 52 bodies | Why it is not listed                                                                    |
| -------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `s`, `t`                   | 65 each               | Share tokens on X links, but `?s=` is a WordPress search and `?t=` a video timestamp    |
| `si`                       | 39                    | Share id on YouTube and Spotify links. Two letters are not distinctive                  |
| `source`, `feature`, `ref` | 85, 23 and 7          | Everyday words that sites use for their own purposes                                    |
| `entry`                    | 32                    | Travels with `g_ep` on Google links, but is an everyday word                            |
| `sa`, `ust`, `usg`         | 78 to 79 each         | Parts of Google's redirect links, where `q` holds the destination. They track no reader |

Listing any of these safely needs a rule scoped to one host, which the policy does not have.

### Measured effect

On the 52 feed bodies:

- The rewrite changes 389 URLs, in 28 of the 52 bodies.
- Every change removes a listed parameter or the separator beside it. No other byte changes, and
  no body's XML validity changes.
- **Only `utm_` bears on fact-check identity today.** Of the 2,074 item links, 43 carry a listed
  parameter, in 4 feeds, and every one is a `utm_` parameter. Every other entry acts on links
  inside article text.
- The other parameters on item links select the page: `p` (640 links) and `post_type` (104).
  These are the parameters that must never be listed.

## Collection rules

A rule is chosen by the source's `collection`. The source list accepts only `rss` and `atom`, so
those two rules decide every record today. They are identical.

### `rss` and `atom`

| Setting                        | Value                | Why                                                                                                                                                                                                                     |
| ------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowedContentTypeSubstrings` | `xml`, `rss`, `atom` | Servers label feeds loosely. Feed responses in the sample used four media types: `application/rss+xml` (1,226), `text/xml` (192), `application/xml` (50) and `application/atom+xml` (32). The substrings match all four |
| `onMissingContentType`         | `QUARANTINE`         | A response that does not say what it is is withheld, not guessed at. No response in the sample lacked a content type, so this costs nothing today. A feed that starts omitting it appears as a quarantine               |
| `maxBytes`                     | `8000000`            | Bounds the memory the sanitizer and extractor spend on one body. The largest body in the sample was 998 KB and the median 99 KB, so the limit is about eight times the largest feed seen                                |
| `defaultLabel`                 | `SAFE_PUBLIC`        | A feed is what a publisher offers for syndication, and every source is on a curated list. A feed that passes the gates above may be used downstream without access controls                                             |
| `rewriteBody`                  | `true`               | Item links are in the body. Without rewriting, `stripQueryParams` would reach only the feed's own URL, and the links that decide fact-check identity would keep their tracking parameters                               |

The 177 responses that were not one of the four feed media types were all `text/html`: a web
page where a feed was expected, which is how error and block pages arrive. They are quarantined.

### `api`, `html` and `default`

No source uses these rules. They exist so that a future collection starts from a conservative
rule instead of none.

- **`html` is `RESTRICTED`.** A full web page carries far more third-party content and incidental
  personal data than a feed does, so it should not be labeled for unrestricted use by default.
- **`default` is `RESTRICTED`.** It catches a collection the policy has no rule for, so that a
  source with an unrecognized collection is never labeled safe by accident.
- **Both restrict on a missing content type, and none rewrites bodies.** The rewrite has only
  been checked against feed XML.

Their size limits (16 MB, 20 MB and 1 MB) have not been tested against real data. Set them from
measurements when a source first uses one of these rules.

## What the policy does not cover

- **Markup inside feed items.** Scripts, tracking pixels and embedded widgets in an item's HTML
  are not removed.
- **Parameters that are tracking on one host and content on another.** See
  [What was left out](#what-was-left-out).
- **Personal data in bodies.** The policy does not look for it. Feeds can contain it
  incidentally. The archive's encryption and access controls protect it, not this policy.
- **Which sources are fetched.** That is the source list.

## Changing the policy

`stripQueryParams` and `rewriteBody` are part of how fact checks are identified, so changing
them can change fact-check ids. Read
[Changing the policy](./runbook.md#changing-the-policy) in the runbook first.

When an entry is added, add its row to [the list](#the-list) with its basis, and apply the same
change to all three files.
