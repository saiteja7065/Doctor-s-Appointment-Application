import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { generateSessionToken, isVonageDemoMode } from '@/lib/vonage';

/**
 * POST /api/video/token
 * Generate a video access token for a session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, appointmentId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected || isVonageDemoMode()) {
      // Return demo token for development
      return NextResponse.json({
        success: true,
        token: `demo_token_${sessionId}_${Date.now()}`,
        sessionId,
        apiKey: process.env.VONAGE_API_KEY || 'demo_api_key',
        role: 'publisher',
        message: 'Demo video token generated successfully'
      });
    }

    // Find the appointment if appointmentId is provided
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }
    } else {
      // Find appointment by sessionId
      appointment = await Appointment.findOne({ sessionId });
      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found for this session' },
          { status: 404 }
        );
      }
    }

    // Verify user authorization and determine role
    let isAuthorized = false;
    let userRole: 'patient' | 'doctor' = 'patient';

    const patient = await Patient.findOne({ clerkId: userId });
    if (patient && appointment.patientId.equals(patient._id)) {
      isAuthorized = true;
      userRole = 'patient';
    }
    
    if (!isAuthorized) {
      const doctor = await Doctor.findOne({ clerkId: userId });
      if (doctor && appointment.doctorId.equals(doctor._id)) {
        isAuthorized = true;
        userRole = 'doctor';
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to access this video session' },
        { status: 403 }
      );
    }

    // Check appointment timing
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // Allow joining 15 minutes before the appointment time
    if (minutesDiff > 15) {
      return NextResponse.json(
        { 
          error: 'Video session has not started yet',
          appointmentTime: appointmentDateTime.toISOString(),
          minutesUntilStart: Math.ceil(minutesDiff)
        },
        { status: 400 }
      );
    }

    // Don't allow joining more than 2 hours after the scheduled time
    if (minutesDiff < -120) {
      return NextResponse.json(
        { error: 'Video session has expired' },
        { status: 400 }
      );
    }

    // Generate Vonage token
    const token = await generateSessionToken(sessionId, userRole, appointment._id.toString());

    console.log(`Generated video token for ${userRole} in session: ${sessionId}`);

    return NextResponse.json({
      success: true,
      token,
      sessionId,
      apiKey: process.env.VONAGE_API_KEY,
      role: userRole,
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      appointmentTime: appointmentDateTime.toISOString(),
      duration: appointment.duration
    });

  } catch (error) {
    console.error('Error generating video token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/token
 * Get token generation requirements and session info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        requirements: {
          sessionId: 'required',
          appointmentId: 'optional (will be looked up by sessionId)',
          authorization: 'Patient or Doctor for the appointment'
        },
        tokenExpiry: '24 hours',
        permissions: [
          'Video publishing',
          'Audio publishing', 
          'Screen sharing',
          'Chat messaging'
        ],
        message: 'Token generation requirements retrieved successfully'
      });
    }

    // If sessionId is provided, return session info
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json({
        sessionId,
        status: 'demo',
        message: 'Demo mode - session info not available'
      });
    }

    const appointment = await Appointment.findOne({ sessionId });
    if (!appointment) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return NextResponse.json({
      sessionId,
      appointmentId: appointment._id,
      status: minutesDiff > 15 ? 'scheduled' : minutesDiff < -120 ? 'expired' : 'active',
      appointmentTime: appointmentDateTime.toISOString(),
      minutesUntilStart: minutesDiff > 0 ? Math.ceil(minutesDiff) : 0,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      duration: appointment.duration
    });

  } catch (error) {
    console.error('Error getting session info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
