import { NextResponse } from 'next/server';
import { checkDatabaseHealth, isMongooseConnected } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs';

export async function GET() {
  try {
    // Check authentication status
    const { userId } = auth();
    const authStatus = userId ? 'authenticated' : 'unauthenticated';
    
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Get system info
    const systemInfo = {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    
    // Determine overall status
    let status = 'ok';
    
    if (dbHealth.status === 'unavailable') {
      status = 'critical';
    } else if (dbHealth.status === 'degraded') {
      status = 'warning';
    }
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      auth: {
        status: authStatus
      },
      database: {
        status: dbHealth.status,
        mongoClient: dbHealth.mongoClient,
        mongoose: dbHealth.mongoose,
        responseTime: `${dbHealth.responseTime}ms`
      },
      system: systemInfo
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}