import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { generateSessionToken } from '@/lib/vonage';
import { sendDoctorEarningsNotification } from '@/lib/email';
import { sendNotification, createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';

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

      // Send consultation started notifications
      try {
        // Patient notification
        const patientForNotification = await Patient.findById(appointment.patientId);
        if (patientForNotification) {
          createNotification(
            patientForNotification.clerkId,
            'patient',
            NotificationType.CONSULTATION_STARTED,
            'Consultation Started',
            `Your consultation with ${appointment.doctorName} has started.`,
            {
              priority: NotificationPriority.URGENT,
              actionUrl: `/consultation/${sessionId}`,
              actionLabel: 'Join Consultation',
              metadata: {
                appointmentId: appointment._id.toString(),
                sessionId,
                doctorName: appointment.doctorName
              }
            }
          );
        }

        // Doctor notification
        const doctor = await Doctor.findById(appointment.doctorId);
        if (doctor) {
          createNotification(
            doctor.clerkId,
            'doctor',
            NotificationType.CONSULTATION_STARTED,
            'Consultation Started',
            `Your consultation with ${appointment.patientName} has started.`,
            {
              priority: NotificationPriority.URGENT,
              actionUrl: `/consultation/${sessionId}`,
              actionLabel: 'Join Consultation',
              metadata: {
                appointmentId: appointment._id.toString(),
                sessionId,
                patientName: appointment.patientName
              }
            }
          );
        }
      } catch (notificationError) {
        console.error('Failed to send consultation started notifications:', notificationError);
      }
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

    const patientForAuth = await Patient.findOne({ clerkId: userId });
    if (patientForAuth && appointment.patientId.equals(patientForAuth._id)) {
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

    // Update doctor earnings using the new earnings service
    const doctor = await Doctor.findById(appointment.doctorId);
    const patientForEarnings = await Patient.findById(appointment.patientId);
    const doctorUser = await User.findById(doctor?.userId);

    if (doctor && doctorUser && patientForEarnings) {
      try {
        // Import the earnings service
        const { EarningsService } = await import('@/lib/services/earningsService');

        // Record consultation earning
        await EarningsService.recordConsultationEarning(
          doctor._id,
          doctorUser.clerkId,
          appointment._id,
          patientForEarnings._id,
          appointment.patientName,
          appointment.consultationFee,
          new Date(appointment.appointmentDate),
          appointment.consultationType
        );

        // Update legacy doctor earnings for backward compatibility
        doctor.totalEarnings += appointment.consultationFee;
        doctor.totalConsultations += 1;
        await doctor.save();
      } catch (earningsError) {
        console.error('Error recording consultation earning:', earningsError);
        // Fallback to legacy method
        doctor.totalEarnings += appointment.consultationFee;
        doctor.totalConsultations += 1;
        await doctor.save();
      }

      // Send doctor earnings notification email
      if (doctorUser && patient) {
        try {
          await sendDoctorEarningsNotification({
            doctorEmail: doctorUser.email,
            doctorName: `${doctorUser.firstName} ${doctorUser.lastName}`,
            patientName: appointment.patientName,
            consultationDate: new Date().toLocaleDateString(),
            duration: 30, // Default duration, could be dynamic
            earningsAmount: appointment.consultationFee,
            totalEarnings: doctor.totalEarnings,
            availableBalance: doctor.totalEarnings, // Simplified - could have withdrawals deducted
            monthlyEarnings: doctor.totalEarnings, // Simplified - could calculate actual monthly
          });
        } catch (emailError) {
          console.error('Failed to send doctor earnings notification email:', emailError);
        }

        // Send consultation completed notifications
        try {
          // Doctor notification
          createNotification(
            doctorUser.clerkId,
            'doctor',
            NotificationType.CONSULTATION_ENDED,
            'Consultation Completed',
            `Your consultation with ${appointment.patientName} has been completed. $${appointment.consultationFee} has been added to your earnings.`,
            {
              priority: NotificationPriority.HIGH,
              actionUrl: '/dashboard/doctor/earnings',
              actionLabel: 'View Earnings',
              metadata: {
                appointmentId: appointment._id.toString(),
                patientName: appointment.patientName,
                earnings: appointment.consultationFee,
                totalEarnings: doctor.totalEarnings
              }
            }
          );

          // Patient notification
          if (patient) {
            createNotification(
              patient.clerkId,
              'patient',
              NotificationType.CONSULTATION_ENDED,
              'Consultation Completed',
              `Your consultation with ${appointment.doctorName} has been completed.`,
              {
                priority: NotificationPriority.HIGH,
                actionUrl: '/dashboard/patient/appointments',
                actionLabel: 'View Appointment',
                metadata: {
                  appointmentId: appointment._id.toString(),
                  doctorName: appointment.doctorName
                }
              }
            );
          }
        } catch (notificationError) {
          console.error('Failed to send consultation completion notification:', notificationError);
        }
      }
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
