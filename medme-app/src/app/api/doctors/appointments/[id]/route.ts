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

// GET - Fetch specific appointment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo appointment data
      console.log('Database not available, returning demo appointment data');
      return NextResponse.json(
        {
          appointment: {
            id: appointmentId,
            patientId: 'patient_1',
            patientName: 'Sarah Johnson',
            patientEmail: 'sarah.johnson@email.com',
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: '10:00',
            duration: 30,
            status: 'scheduled',
            topic: 'General Consultation',
            description: 'Follow-up on recent blood work results',
            consultationType: 'video',
            consultationFee: 2,
            meetingLink: 'https://meet.medme.com/room/abc123',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          message: 'Demo appointment data'
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

    // TODO: Implement actual appointment fetching from database
    // For now, return demo data
    return NextResponse.json(
      {
        appointment: {
          id: appointmentId,
          patientId: 'patient_1',
          patientName: 'Sarah Johnson',
          patientEmail: 'sarah.johnson@email.com',
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: '10:00',
          duration: 30,
          status: 'scheduled',
          topic: 'General Consultation',
          description: 'Follow-up on recent blood work results',
          consultationType: 'video',
          consultationFee: 2,
          meetingLink: 'https://meet.medme.com/room/abc123',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        doctorId: doctor._id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update appointment status or details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Parse request body
    const body = await request.json();
    const { status, notes, duration } = body;

    // Validate status if provided
    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid appointment status' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for appointment update');
      return NextResponse.json(
        {
          message: 'Appointment updated successfully (demo mode)',
          appointment: {
            id: appointmentId,
            status: status || 'scheduled',
            notes: notes || '',
            duration: duration || 30,
            updatedAt: new Date().toISOString()
          }
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

    // TODO: Implement actual appointment update in database
    // For now, return demo response
    console.log(`Appointment ${appointmentId} updated by doctor ${userId}:`, { status, notes, duration });

    return NextResponse.json(
      {
        message: 'Appointment updated successfully',
        appointment: {
          id: appointmentId,
          status: status || 'scheduled',
          notes: notes || '',
          duration: duration || 30,
          updatedAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Parse request body for cancellation reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for appointment cancellation');
      return NextResponse.json(
        {
          message: 'Appointment cancelled successfully (demo mode)',
          appointmentId,
          reason: reason || 'Cancelled by doctor'
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

    // TODO: Implement actual appointment cancellation in database
    // For now, return demo response
    console.log(`Appointment ${appointmentId} cancelled by doctor ${userId}. Reason: ${reason || 'Not specified'}`);

    return NextResponse.json(
      {
        message: 'Appointment cancelled successfully',
        appointmentId,
        reason: reason || 'Cancelled by doctor',
        cancelledAt: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
