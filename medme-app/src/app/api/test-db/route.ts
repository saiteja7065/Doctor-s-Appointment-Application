import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test the connection
    const isConnected = await connectToMongoose();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to MongoDB',
        connected: false,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Get connection details
    const connectionState = mongoose.connection.readyState;
    const dbName = mongoose.connection.db?.databaseName;
    
    // Test a simple operation
    let collections = [];
    try {
      if (mongoose.connection.db) {
        const collectionList = await mongoose.connection.db.listCollections().toArray();
        collections = collectionList.map(col => col.name);
      }
    } catch (error) {
      console.error('Error listing collections:', error);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      connected: true,
      connectionState: getConnectionStateText(connectionState),
      databaseName: dbName,
      collections: collections,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getConnectionStateText(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}
