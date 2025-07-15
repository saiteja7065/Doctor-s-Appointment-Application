import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for technical prerequisites testing
 * Used by the video consultation system to test connectivity and speed
 */

export async function GET(request: NextRequest) {
  try {
    // Simple health check response
    const timestamp = new Date().toISOString();
    const response = {
      status: 'healthy',
      timestamp,
      server: 'medme-api',
      version: '1.0.0',
      uptime: process.uptime(),
      // Add some data for speed testing
      testData: 'x'.repeat(1000) // 1KB of test data
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle speed test uploads
    const body = await request.json();
    const timestamp = new Date().toISOString();
    
    // Echo back the data size for upload speed calculation
    const dataSize = JSON.stringify(body).length;
    
    const response = {
      status: 'received',
      timestamp,
      dataSize,
      echo: 'Upload test completed successfully'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check POST failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Failed to process upload test',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  try {
    // Simple HEAD request for latency testing
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check HEAD failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}
