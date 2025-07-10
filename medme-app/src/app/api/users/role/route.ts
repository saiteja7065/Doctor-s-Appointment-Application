import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { User } from '@/lib/models/User';

// Connect to MongoDB
async function connectToDatabase() {
  if (mongoose.connections[0].readyState) {
    return true;
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('demo:demo')) {
    console.warn('MongoDB URI not configured or using placeholder. Database features will be disabled.');
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const isConnected = await connectToDatabase();

    if (!isConnected) {
      // Return a default role when database is not available
      console.log('Database not available, returning default patient role for user:', userId);
      return NextResponse.json(
        {
          role: 'patient',
          status: 'active',
          userId: 'temp_' + userId,
          message: 'Database not configured - using default role'
        },
        { status: 200 }
      );
    }

    // Get user role
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        role: user.role,
        status: user.status,
        userId: user._id,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
