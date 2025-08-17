import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint for network latency testing
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'MedMe API is healthy'
  });
}

/**
 * HEAD /api/health
 * Lightweight health check for latency testing
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
