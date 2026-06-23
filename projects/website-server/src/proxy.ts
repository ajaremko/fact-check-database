import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { consume } from '@/lib/rate-limiting'

export async function proxy(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ip = (request as any).ip

  // Fallback to standard proxy headers if request.ip is undefined
  if (!ip) {
    // This is the header that will be received in development
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
      // The header can contain a comma-separated list; the first one is the client
      ip = forwardedFor.split(',')[0].trim()
    } else {
      ip = request.headers.get('x-real-ip') || '127.0.0.1'
    }
  }

  const result = await consume(ip)

  if (result.type === 'quota_exceeded') {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  return NextResponse.next()
}

// Only match certain routes to optimize performance
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
