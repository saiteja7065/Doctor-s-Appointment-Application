import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { withPatientAuth } from '@/lib/auth/rbac';
import { createVideoSession, type VonageSession } from '@/lib/vonage';
import { sendAppointmentConfirmation, sendCreditDeductionNotification, sendLowCreditWarning } from '@/lib/email';
import { createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';
import {
  convertUTCToLocalTime,
  convertLocalTimeToUTC,
  isValidTimezone,
  getUserTimezone
} from '@/lib/timezone';
import { logAppointmentEvent, logPaymentEvent } from '@/lib/audit';
import { AuditAction } from '@/lib/models/AuditLog';

interface BookingRequest {
  doctorId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM in patient's local timezone
  topic: string;
  description?: string;
  consultationType: 'video' | 'phone';
  timezone?: string; // Patient's timezone
}

/**
 * POST /api/appointments/book
 * Book a new appointment with a doctor
 */
async function postHandler(userContext: any, req: NextRequest) {
    try {
      const body: BookingRequest = await req.json();
      const { doctorId, appointmentDate, appointmentTime, topic, description, consultationType, timezone } = body;

      // Get patient timezone (from request or auto-detect)
      const patientTimezone = timezone || getUserTimezone();

      // Validate required fields
      if (!doctorId || !appointmentDate || !appointmentTime || !topic) {
        return NextResponse.json(
          { error: 'Missing required fields: doctorId, appointmentDate, appointmentTime, topic' },
          { status: 400 }
        );
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(appointmentTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM' },
          { status: 400 }
        );
      }

      // Validate timezone
      if (!isValidTimezone(patientTimezone)) {
        return NextResponse.json(
          { error: 'Invalid timezone' },
          { status: 400 }
        );
      }

      // Convert appointment time from patient's local timezone to UTC
      const appointmentTimeUTC = convertLocalTimeToUTC(appointmentTime, patientTimezone);

      // Validate appointment is in the future (using UTC time)
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTimeUTC}:00Z`);
      const now = new Date();
      if (appointmentDateTime <= now) {
        return NextResponse.json(
          { error: 'Appointment time must be in the future' },
          { status: 400 }
        );
      }

      // Connect to database
      const isConnected = await connectToMongoose();
      if (!isConnected) {
        return NextResponse.json(
          { error: 'Database connection failed. Please try again later.' },
          { status: 503 }
        );
      }

      // Find doctor with populated user data
      const doctor = await Doctor.findById(doctorId).populate('userId');
      if (!doctor) {
        return NextResponse.json(
          { error: 'Doctor not found' },
          { status: 404 }
        );
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.clerkId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      // Find user for patient details
      const user = await User.findOne({ clerkId: userContext.clerkId });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if patient has sufficient credits
      const consultationFee = doctor.consultationFee || 2; // Default to 2 credits
      if (patient.creditBalance < consultationFee) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            message: `You need ${consultationFee} credits but only have ${patient.creditBalance}. Please purchase more credits.`,
            requiredCredits: consultationFee,
            currentCredits: patient.creditBalance
          },
          { status: 402 } // Payment Required
        );
      }

      // Check for existing appointment at the same time
      const existingAppointment = await Appointment.findOne({
        doctorId: doctor._id,
        appointmentDate,
        appointmentTime,
        status: { $in: ['scheduled', 'in_progress'] }
      });

      if (existingAppointment) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please select a different time.' },
          { status: 409 } // Conflict
        );
      }

      // Create Vonage session for video consultation
      let sessionData: VonageSession | null = null;
      if (consultationType === 'video') {
        try {
          sessionData = await createVideoSession(`${doctorId}_${appointmentDate}_${appointmentTime}`);
        } catch (error) {
          console.error('Error creating video session:', error);
          // Continue with booking even if video session creation fails
          // We'll create a demo session as fallback
          sessionData = {
            sessionId: `demo_session_${Date.now()}`,
            token: `demo_token_${Date.now()}`,
            meetingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/demo_session_${Date.now()}`
          };
        }
      }

      // Start transaction for atomic operations
      const session = await connectToMongoose();

      try {
        // Deduct credits from patient
        const creditDeductionResult = patient.deductCredits(consultationFee);
        if (!creditDeductionResult) {
          return NextResponse.json(
            { error: 'Failed to deduct credits. Please try again.' },
            { status: 500 }
          );
        }

        // Update patient statistics
        patient.totalAppointments += 1;
        patient.totalSpent += consultationFee;
        await patient.save();

        // Create appointment
        const appointment = new Appointment({
          patientId: patient._id,
          doctorId: doctor._id,
          patientName: `${user.firstName} ${user.lastName}`,
          patientEmail: user.email,
          doctorName: `${(doctor.userId as any)?.firstName || 'Dr.'} ${(doctor.userId as any)?.lastName || 'Unknown'}`,
          appointmentDate,
          appointmentTime: appointmentTimeUTC, // Store in UTC
          appointmentTimeLocal: appointmentTime, // Store original local time
          patientTimezone, // Store patient's timezone
          doctorTimezone: doctor.timeZone, // Store doctor's timezone
          duration: 30, // Default 30 minutes
          status: 'scheduled',
          topic: topic.trim(),
          description: description?.trim() || '',
          consultationType: consultationType || 'video',
          consultationFee,
          paymentStatus: 'paid',
          meetingLink: sessionData?.meetingLink,
          sessionId: sessionData?.sessionId,
        });

        const savedAppointment = await appointment.save();

        // Log appointment booking event
        await logAppointmentEvent(
          AuditAction.APPOINTMENT_CREATE,
          userContext.clerkId,
          savedAppointment._id.toString(),
          `Patient ${user.firstName} ${user.lastName} booked appointment with Dr. ${(doctor.userId as any)?.firstName || 'Unknown'} ${(doctor.userId as any)?.lastName || 'Doctor'} for ${appointmentDate} at ${appointmentTime}`,
          req,
          {
            doctorId: doctor._id.toString(),
            patientId: patient._id.toString(),
            consultationFee,
            consultationType,
            topic: topic.trim(),
            appointmentDate,
            appointmentTime,
            patientTimezone,
            doctorTimezone: doctor.timeZone,
          }
        );

        // Log credit deduction event
        await logPaymentEvent(
          AuditAction.CREDIT_DEDUCT,
          userContext.clerkId,
          savedAppointment._id.toString(),
          consultationFee,
          `Credits deducted for appointment booking: ${consultationFee} credits`,
          req,
          {
            previousBalance: patient.creditBalance + consultationFee,
            newBalance: patient.creditBalance,
            appointmentId: savedAppointment._id.toString(),
          }
        );

        // Send appointment confirmation email
        try {
          await sendAppointmentConfirmation({
            patientEmail: user.email,
            patientName: `${user.firstName} ${user.lastName}`,
            doctorName: `${(doctor.userId as any)?.firstName || 'Dr.'} ${(doctor.userId as any)?.lastName || 'Unknown'}`,
            specialty: doctor.specialty,
            appointmentDate: new Date(appointmentDateTime).toLocaleDateString(),
            appointmentTime: new Date(appointmentDateTime).toLocaleTimeString(),
            consultationType: consultationType,
            cost: consultationFee,
          });
        } catch (emailError) {
          console.error('Failed to send appointment confirmation email:', emailError);
          // Don't fail the appointment booking if email fails
        }

        // Send credit deduction notification email
        try {
          await sendCreditDeductionNotification({
            patientEmail: user.email,
            patientName: `${user.firstName} ${user.lastName}`,
            doctorName: `${(doctor.userId as any)?.firstName || 'Dr.'} ${(doctor.userId as any)?.lastName || 'Unknown'}`,
            appointmentDate: new Date(appointmentDateTime).toLocaleDateString(),
            creditsUsed: consultationFee,
            remainingCredits: patient.creditBalance,
          });
        } catch (emailError) {
          console.error('Failed to send credit deduction email:', emailError);
        }

        // Send low credit warning if balance is low
        if (patient.creditBalance <= 2) {
          try {
            await sendLowCreditWarning({
              patientEmail: user.email,
              patientName: `${user.firstName} ${user.lastName}`,
              currentCredits: patient.creditBalance,
            });
          } catch (emailError) {
            console.error('Failed to send low credit warning email:', emailError);
          }
        }

        // Send in-app notifications
        try {
          // Patient notification
          createNotification(
            patient.clerkId,
            'patient',
            NotificationType.APPOINTMENT_BOOKED,
            'Appointment Confirmed',
            `Your appointment with Dr. ${(doctor.userId as any)?.firstName || 'Unknown'} ${(doctor.userId as any)?.lastName || 'Doctor'} on ${new Date(appointmentDateTime).toLocaleDateString()} has been confirmed.`,
            {
              priority: NotificationPriority.HIGH,
              actionUrl: '/dashboard/patient/appointments',
              actionLabel: 'View Appointment',
              metadata: {
                appointmentId: savedAppointment._id.toString(),
                doctorName: `${(doctor.userId as any)?.firstName || 'Dr.'} ${(doctor.userId as any)?.lastName || 'Unknown'}`,
                appointmentDate: new Date(appointmentDateTime).toLocaleDateString(),
                creditsUsed: consultationFee,
                remainingCredits: patient.creditBalance
              }
            }
          );

          // Doctor notification
          createNotification(
            doctor.clerkId,
            'doctor',
            NotificationType.APPOINTMENT_BOOKED,
            'New Appointment Booked',
            `${user.firstName} ${user.lastName} has booked an appointment with you on ${new Date(appointmentDateTime).toLocaleDateString()}.`,
            {
              priority: NotificationPriority.HIGH,
              actionUrl: '/dashboard/doctor/appointments',
              actionLabel: 'View Appointment',
              metadata: {
                appointmentId: savedAppointment._id.toString(),
                patientName: `${user.firstName} ${user.lastName}`,
                appointmentDate: new Date(appointmentDateTime).toLocaleDateString()
              }
            }
          );

          // Credit deduction notification
          if (patient.creditBalance <= 2) {
            createNotification(
              patient.clerkId,
              'patient',
              NotificationType.LOW_CREDIT_WARNING,
              'Low Credit Balance',
              `You have ${patient.creditBalance} credits remaining. Consider purchasing more credits.`,
              {
                priority: NotificationPriority.MEDIUM,
                actionUrl: '/dashboard/patient/subscription',
                actionLabel: 'Buy Credits',
                metadata: { remainingCredits: patient.creditBalance }
              }
            );
          }
        } catch (notificationError) {
          console.error('Failed to send appointment confirmation notification:', notificationError);
        }

        // Update doctor's earnings and consultation count
        doctor.totalEarnings = (doctor.totalEarnings || 0) + consultationFee;
        doctor.totalConsultations = (doctor.totalConsultations || 0) + 1;
        await doctor.save();

        return NextResponse.json(
          {
            success: true,
            message: 'Appointment booked successfully!',
            appointment: {
              id: savedAppointment._id,
              doctorId: doctor._id,
              doctorName: `${(doctor.userId as any)?.firstName || 'Dr.'} ${(doctor.userId as any)?.lastName || 'Unknown'}`,
              patientId: patient._id,
              appointmentDate,
              appointmentTime,
              duration: savedAppointment.duration,
              topic: savedAppointment.topic,
              description: savedAppointment.description,
              consultationType: savedAppointment.consultationType,
              status: savedAppointment.status,
              meetingLink: savedAppointment.meetingLink,
              sessionId: savedAppointment.sessionId,
              createdAt: savedAppointment.createdAt
            },
            remainingCredits: patient.creditBalance,
            videoSession: sessionData
          },
          { status: 201 }
        );

      } catch (transactionError) {
        console.error('Transaction error during booking:', transactionError);
        return NextResponse.json(
          { error: 'Failed to complete booking. Please try again.' },
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Error booking appointment:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}

export const POST = withPatientAuth(postHandler);

/**
 * GET /api/appointments/book
 * Get available time slots for a doctor on a specific date
 */
async function getHandler(userContext: any, req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const doctorId = searchParams.get('doctorId');
      const date = searchParams.get('date');
      const timezone = searchParams.get('timezone') || 'UTC';

      if (!doctorId || !date) {
        return NextResponse.json(
          { error: 'Missing required parameters: doctorId, date' },
          { status: 400 }
        );
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Connect to database
      const isConnected = await connectToMongoose();
      if (!isConnected) {
        // Return demo availability data (times in requested timezone)
        const demoSlots = [];
        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const isAvailable = Math.random() > 0.3;
            demoSlots.push({
              time: timeString,
              isAvailable,
              isBooked: false
            });
          }
        }

        return NextResponse.json({
          date,
          slots: demoSlots,
          timezone,
          message: 'Demo availability data'
        });
      }

      // Find doctor
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return NextResponse.json(
          { error: 'Doctor not found' },
          { status: 404 }
        );
      }

      // Get day of week for the requested date in UTC (since availability is stored in UTC)
      const requestedDateUTC = new Date(date + 'T00:00:00.000Z');
      const dayOfWeekUTC = requestedDateUTC.getUTCDay();

      // Get doctor's availability for this day (stored in UTC)
      const dayAvailability = doctor.availability?.filter(slot =>
        slot.dayOfWeek === dayOfWeekUTC && slot.isAvailable
      ) || [];

      // Get existing appointments for this date
      const existingAppointments = await Appointment.find({
        doctorId: doctor._id,
        appointmentDate: date,
        status: { $in: ['scheduled', 'in_progress'] }
      }).select('appointmentTime');

      const bookedTimes = existingAppointments.map(apt => apt.appointmentTime);

      // Generate available time slots and convert to local timezone
      const availableSlots = [];

      for (const availability of dayAvailability) {
        const startTimeUTC = availability.startTime;
        const endTimeUTC = availability.endTime;

        // Convert UTC times to local timezone for display
        const startTimeLocal = convertUTCTimeToLocal(startTimeUTC, timezone, requestedDateUTC);
        const endTimeLocal = convertUTCTimeToLocal(endTimeUTC, timezone, requestedDateUTC);

        // Generate 30-minute slots within this availability window
        let currentTimeUTC = startTimeUTC;
        while (currentTimeUTC < endTimeUTC) {
          const currentTimeLocal = convertUTCTimeToLocal(currentTimeUTC, timezone, requestedDateUTC);
          const isBooked = bookedTimes.includes(currentTimeUTC);

          availableSlots.push({
            time: currentTimeLocal, // Display time in local timezone
            timeUTC: currentTimeUTC, // Keep UTC time for booking
            isAvailable: !isBooked,
            isBooked
          });

          // Add 30 minutes to UTC time
          const [hours, minutes] = currentTimeUTC.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + 30;
          const newHours = Math.floor(totalMinutes / 60);
          const newMinutes = totalMinutes % 60;
          currentTimeUTC = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        }
      }

      return NextResponse.json({
        date,
        slots: availableSlots.sort((a, b) => a.time.localeCompare(b.time)),
        timezone,
        doctorTimezone: doctor.timeZone
      });

    } catch (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}

export const GET = withPatientAuth(getHandler);

// Helper function to convert UTC time to local timezone
function convertUTCTimeToLocal(utcTime: string, targetTimezone: string, date: Date): string {
  try {
    const [hours, minutes] = utcTime.split(':').map(Number);
    const utcDateTime = new Date(date);
    utcDateTime.setUTCHours(hours, minutes, 0, 0);

    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(utcDateTime);

    return localTime;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return utcTime; // Fallback to UTC time
  }
}
