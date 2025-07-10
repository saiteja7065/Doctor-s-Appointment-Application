import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { Doctor } from '@/lib/models/Doctor';

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

// GET - Fetch doctor's availability
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
      // Return demo availability data
      console.log('Database not available, returning demo availability data');
      return NextResponse.json(
        {
          availability: [
            {
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '12:00',
              isAvailable: true
            },
            {
              dayOfWeek: 1,
              startTime: '14:00',
              endTime: '17:00',
              isAvailable: true
            },
            {
              dayOfWeek: 2,
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: true
            },
            {
              dayOfWeek: 3,
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: true
            },
            {
              dayOfWeek: 4,
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: true
            },
            {
              dayOfWeek: 5,
              startTime: '09:00',
              endTime: '15:00',
              isAvailable: true
            }
          ],
          message: 'Demo availability data'
        },
        { status: 200 }
      );
    }

    // Find doctor by clerkId
    const doctor = await Doctor.findOne({ clerkId: userId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        availability: doctor.availability || [],
        lastUpdated: doctor.updatedAt
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update doctor's availability
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { availability } = body;

    // Validate availability data
    if (!Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Availability must be an array' },
        { status: 400 }
      );
    }

    // Validate each time slot
    for (const slot of availability) {
      if (
        typeof slot.dayOfWeek !== 'number' ||
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6 ||
        typeof slot.startTime !== 'string' ||
        typeof slot.endTime !== 'string' ||
        typeof slot.isAvailable !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Invalid availability slot format' },
          { status: 400 }
        );
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM format' },
          { status: 400 }
        );
      }

      // Validate that start time is before end time
      if (slot.startTime >= slot.endTime) {
        return NextResponse.json(
          { error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for availability update');
      return NextResponse.json(
        {
          message: 'Availability updated successfully (demo mode)',
          availability,
          lastUpdated: new Date().toISOString()
        },
        { status: 200 }
      );
    }

    // Find and update doctor
    const doctor = await Doctor.findOne({ clerkId: userId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Update availability
    doctor.availability = availability;
    doctor.lastActiveAt = new Date();
    await doctor.save();

    // Log the update
    console.log(`Availability updated for doctor ${userId}: ${availability.length} time slots`);

    return NextResponse.json(
      {
        message: 'Availability updated successfully',
        availability: doctor.availability,
        lastUpdated: doctor.updatedAt
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating availability:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all availability
export async function DELETE() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for availability clear');
      return NextResponse.json(
        {
          message: 'Availability cleared successfully (demo mode)',
          availability: []
        },
        { status: 200 }
      );
    }

    // Find and update doctor
    const doctor = await Doctor.findOne({ clerkId: userId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Clear availability
    doctor.availability = [];
    doctor.lastActiveAt = new Date();
    await doctor.save();

    console.log(`Availability cleared for doctor ${userId}`);

    return NextResponse.json(
      {
        message: 'Availability cleared successfully',
        availability: []
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error clearing availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
