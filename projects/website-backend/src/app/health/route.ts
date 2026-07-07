// app/api/health/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Never cache

export async function GET() {
  try {
    // Optional: Add database or service dependency verification here
    // await db.ping();

    return NextResponse.json(
      { status: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 } // Service Unavailable
    )
  }
}
