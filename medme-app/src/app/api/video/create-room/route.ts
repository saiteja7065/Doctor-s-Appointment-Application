import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { createVideoSession, type VonageSession } from '@/lib/vonage';
import { createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';

/**
 * POST /api/video/create-room
 * Create a new video consultation room for an appointment
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
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo session for development
      const demoSession: VonageSession = {
        sessionId: `demo_session_${appointmentId}_${Date.now()}`,
        token: `demo_token_${appointmentId}_${Date.now()}`,
        meetingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/demo_session_${appointmentId}_${Date.now()}`
      };

      return NextResponse.json({
        success: true,
        sessionId: demoSession.sessionId,
        meetingLink: demoSession.meetingLink,
        message: 'Demo video room created successfully'
      });
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify user authorization (doctor or patient)
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
        { error: 'You are not authorized to create a video room for this appointment' },
        { status: 403 }
      );
    }

    // Check if appointment already has a session
    if (appointment.sessionId) {
      return NextResponse.json({
        success: true,
        sessionId: appointment.sessionId,
        meetingLink: appointment.meetingLink,
        message: 'Video room already exists for this appointment'
      });
    }

    // Create Vonage video session
    const sessionData = await createVideoSession(appointmentId);

    // Update appointment with session details
    appointment.sessionId = sessionData.sessionId;
    appointment.meetingLink = sessionData.meetingLink;
    await appointment.save();

    // Create notification for the other party
    const otherPartyRole = userRole === 'patient' ? 'doctor' : 'patient';
    const otherPartyId = userRole === 'patient' ? appointment.doctorId : appointment.patientId;
    
    await createNotification({
      userId: otherPartyId.toString(),
      type: NotificationType.VIDEO_ROOM_CREATED,
      priority: NotificationPriority.HIGH,
      title: 'Video Room Created',
      message: `A video consultation room has been created for your appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}`,
      data: {
        appointmentId: appointment._id.toString(),
        sessionId: sessionData.sessionId,
        meetingLink: sessionData.meetingLink
      }
    });

    console.log(`Video room created for appointment ${appointmentId} by ${userRole}: ${sessionData.sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId: sessionData.sessionId,
      meetingLink: sessionData.meetingLink,
      appointmentId: appointment._id,
      message: 'Video room created successfully'
    });

  } catch (error) {
    console.error('Error creating video room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/create-room
 * Get video room creation requirements and limits
 */
export async function GET() {
  try {
    return NextResponse.json({
      requirements: {
        appointmentId: 'required',
        authorization: 'Patient or Doctor for the appointment'
      },
      limits: {
        maxDuration: '2 hours',
        maxParticipants: 2,
        recordingEnabled: true
      },
      features: [
        'HD video quality',
        'Screen sharing',
        'Chat messaging',
        'Session recording',
        'Mobile support'
      ],
      message: 'Video room creation requirements retrieved successfully'
    });
  } catch (error) {
    console.error('Video room config error:', error);
    return NextResponse.json(
      { error: 'Failed to get video room configuration' },
      { status: 500 }
    );
  }
}
