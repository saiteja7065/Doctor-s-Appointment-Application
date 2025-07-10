import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { generateSessionToken } from '@/lib/vonage';

/**
 * GET /api/consultations/[sessionId]/token
 * Generate a token for joining a video consultation session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo token for development
      const demoToken = `demo_token_${userId}_${sessionId}_${Date.now()}`;
      return NextResponse.json({
        token: demoToken,
        sessionId,
        role: 'patient', // Default role for demo
        message: 'Demo token generated'
      });
    }

    // Find the appointment associated with this session
    const appointment = await Appointment.findOne({ sessionId });
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found for this session' },
        { status: 404 }
      );
    }

    // Check if the user is authorized to join this session
    let userRole: 'patient' | 'doctor' | null = null;
    
    // Check if user is the patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (patient && appointment.patientId.equals(patient._id)) {
      userRole = 'patient';
    }
    
    // Check if user is the doctor
    if (!userRole) {
      const doctor = await Doctor.findOne({ clerkId: userId });
      if (doctor && appointment.doctorId.equals(doctor._id)) {
        userRole = 'doctor';
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { error: 'You are not authorized to join this consultation' },
        { status: 403 }
      );
    }

    // Check if the appointment is scheduled for today or is currently active
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // Allow joining 15 minutes before the appointment time
    if (minutesDiff > 15) {
      return NextResponse.json(
        { 
          error: 'Consultation has not started yet',
          appointmentTime: appointmentDateTime.toISOString(),
          minutesUntilStart: Math.ceil(minutesDiff)
        },
        { status: 400 }
      );
    }

    // Don't allow joining more than 2 hours after the scheduled time
    if (minutesDiff < -120) {
      return NextResponse.json(
        { error: 'Consultation time has expired' },
        { status: 400 }
      );
    }

    // Generate token for the session
    const token = await generateSessionToken(sessionId, userRole, appointment._id.toString());

    // Update appointment status to in-progress if it's still scheduled
    if (appointment.status === 'scheduled') {
      appointment.status = 'in_progress';
      await appointment.save();
    }

    return NextResponse.json({
      token,
      sessionId,
      role: userRole,
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      appointmentTime: appointmentDateTime.toISOString(),
      duration: appointment.duration
    });

  } catch (error) {
    console.error('Error generating consultation token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consultations/[sessionId]/token
 * End a consultation session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.sessionId;
    const body = await request.json();
    const { action } = body;

    if (action !== 'end_session') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json({
        message: 'Session ended successfully (demo mode)',
        sessionId
      });
    }

    // Find the appointment
    const appointment = await Appointment.findOne({ sessionId });
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify user authorization
    let isAuthorized = false;
    
    const patient = await Patient.findOne({ clerkId: userId });
    if (patient && appointment.patientId.equals(patient._id)) {
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
      const doctor = await Doctor.findOne({ clerkId: userId });
      if (doctor && appointment.doctorId.equals(doctor._id)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to end this consultation' },
        { status: 403 }
      );
    }

    // Update appointment status to completed
    appointment.status = 'completed';
    appointment.paymentStatus = 'paid'; // Mark as paid when consultation is completed
    await appointment.save();

    // Update doctor earnings if not already done
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      doctor.totalEarnings += appointment.consultationFee;
      await doctor.save();
    }

    return NextResponse.json({
      message: 'Consultation ended successfully',
      sessionId,
      appointmentId: appointment._id,
      status: 'completed'
    });

  } catch (error) {
    console.error('Error ending consultation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
