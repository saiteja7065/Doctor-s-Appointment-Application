import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { endVideoSession, stopArchive } from '@/lib/vonage';
import { createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';
import { sendConsultationCompletedNotification } from '@/lib/email';

/**
 * POST /api/video/end-session
 * End a video consultation session
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
    const { sessionId, duration, notes, prescription, archiveId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success for demo mode
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Demo session ended successfully'
      });
    }

    // Find the appointment
    const appointment = await Appointment.findOne({ sessionId });
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found for this session' },
        { status: 404 }
      );
    }

    // Verify user authorization and determine role
    let isAuthorized = false;
    let userRole: 'patient' | 'doctor' = 'patient';
    let currentUser = null;

    const patient = await Patient.findOne({ clerkId: userId });
    if (patient && appointment.patientId.equals(patient._id)) {
      isAuthorized = true;
      userRole = 'patient';
      currentUser = patient;
    }
    
    if (!isAuthorized) {
      const doctor = await Doctor.findOne({ clerkId: userId });
      if (doctor && appointment.doctorId.equals(doctor._id)) {
        isAuthorized = true;
        userRole = 'doctor';
        currentUser = doctor;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to end this video session' },
        { status: 403 }
      );
    }

    // Check if session is already ended
    if (appointment.status === 'completed') {
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Session was already ended'
      });
    }

    // Stop video recording if archiveId is provided
    if (archiveId) {
      try {
        await stopArchive(archiveId);
        console.log(`Stopped recording for session: ${sessionId}`);
      } catch (error) {
        console.error('Error stopping archive:', error);
        // Continue with session ending even if archive stop fails
      }
    }

    // End the Vonage session
    const sessionEnded = await endVideoSession(sessionId);
    if (!sessionEnded) {
      console.warn(`Failed to end Vonage session: ${sessionId}`);
      // Continue with database updates even if Vonage session end fails
    }

    // Calculate actual duration if not provided
    const actualDuration = duration || appointment.duration;
    const endTime = new Date();

    // Update appointment status and details
    appointment.status = 'completed';
    appointment.actualDuration = actualDuration;
    appointment.completedAt = endTime;
    
    // Add consultation notes and prescription if provided by doctor
    if (userRole === 'doctor') {
      if (notes) {
        appointment.consultationNotes = notes;
      }
      if (prescription) {
        appointment.prescription = prescription;
      }
    }

    await appointment.save();

    // Update doctor's earnings if this was a paid consultation
    if (userRole === 'doctor' && appointment.consultationFee > 0) {
      const doctor = await Doctor.findById(appointment.doctorId);
      if (doctor) {
        doctor.totalEarnings = (doctor.totalEarnings || 0) + appointment.consultationFee;
        doctor.completedConsultations = (doctor.completedConsultations || 0) + 1;
        await doctor.save();
      }
    }

    // Create notifications for both parties
    const otherPartyRole = userRole === 'patient' ? 'doctor' : 'patient';
    const otherPartyId = userRole === 'patient' ? appointment.doctorId : appointment.patientId;
    
    // Notification for the other party
    await createNotification({
      userId: otherPartyId.toString(),
      type: NotificationType.CONSULTATION_COMPLETED,
      priority: NotificationPriority.MEDIUM,
      title: 'Consultation Completed',
      message: `Your video consultation has been completed. Duration: ${actualDuration} minutes.`,
      data: {
        appointmentId: appointment._id.toString(),
        sessionId,
        duration: actualDuration,
        completedBy: userRole
      }
    });

    // Send email notifications
    try {
      const patientUser = await User.findOne({ clerkId: patient?.clerkId });
      const doctorUser = await User.findOne({ clerkId: (await Doctor.findById(appointment.doctorId))?.clerkId });
      
      if (patientUser && doctorUser) {
        await sendConsultationCompletedNotification(
          patientUser.email,
          doctorUser.email,
          {
            appointmentId: appointment._id.toString(),
            patientName: appointment.patientName,
            doctorName: appointment.doctorName,
            date: appointment.appointmentDate,
            time: appointment.appointmentTime,
            duration: actualDuration,
            notes: appointment.consultationNotes,
            prescription: appointment.prescription
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending consultation completion emails:', emailError);
      // Don't fail the request if email sending fails
    }

    console.log(`Video session ended by ${userRole} for appointment ${appointment._id}: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      appointmentId: appointment._id,
      duration: actualDuration,
      completedAt: endTime.toISOString(),
      completedBy: userRole,
      message: 'Video session ended successfully'
    });

  } catch (error) {
    console.error('Error ending video session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/end-session
 * Get session ending requirements and current session status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        requirements: {
          sessionId: 'required',
          duration: 'optional (actual consultation duration in minutes)',
          notes: 'optional (doctor only - consultation notes)',
          prescription: 'optional (doctor only - prescription details)',
          archiveId: 'optional (recording ID to stop)'
        },
        permissions: {
          patient: 'Can end session',
          doctor: 'Can end session and add notes/prescription'
        },
        effects: [
          'Ends video session for all participants',
          'Updates appointment status to completed',
          'Stops any active recording',
          'Sends notifications to both parties',
          'Updates doctor earnings (if applicable)',
          'Sends email confirmations'
        ],
        message: 'Session ending requirements retrieved successfully'
      });
    }

    // If sessionId is provided, return current session status
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json({
        sessionId,
        status: 'demo',
        canEnd: true,
        message: 'Demo mode - session can be ended'
      });
    }

    const appointment = await Appointment.findOne({ sessionId });
    if (!appointment) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId,
      appointmentId: appointment._id,
      status: appointment.status,
      canEnd: appointment.status !== 'completed',
      appointmentTime: `${appointment.appointmentDate}T${appointment.appointmentTime}:00`,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      duration: appointment.duration,
      actualDuration: appointment.actualDuration,
      completedAt: appointment.completedAt
    });

  } catch (error) {
    console.error('Error getting session status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
