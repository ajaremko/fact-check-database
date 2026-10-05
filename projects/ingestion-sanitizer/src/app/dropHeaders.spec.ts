import { describe, it, expect } from 'vitest'

import { dropHeaders } from './dropHeaders'

describe('dropHeaders', () => {
  it('drops the listed headers, whatever case their names are written in', () => {
    const result = dropHeaders(
      {
        'Content-Type': 'application/rss+xml; charset=UTF-8',
        'Set-Cookie': '__cf_bm=k3Jx9.Qz; path=/; HttpOnly; Secure',
        etag: '"a89eb068250919fc594f4fde501b45dd"',
      },
      ['set-cookie', 'cookie', 'authorization']
    )
    expect(result).toStrictEqual({
      headers: {
        'Content-Type': 'application/rss+xml; charset=UTF-8',
        etag: '"a89eb068250919fc594f4fde501b45dd"',
      },
      dropped: ['Set-Cookie'],
    })
  })

  it('keeps every header when none is listed', () => {
    const result = dropHeaders(
      { 'content-type': 'text/xml', date: 'Sat, 02 May 2026 19:56:09 GMT' },
      ['set-cookie']
    )
    expect(result).toStrictEqual({
      headers: {
        'content-type': 'text/xml',
        date: 'Sat, 02 May 2026 19:56:09 GMT',
      },
      dropped: [],
    })
  })
})
