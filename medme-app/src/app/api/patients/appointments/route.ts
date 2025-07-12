import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Patient } from '@/lib/models/Patient';
import { Doctor } from '@/lib/models/Doctor';
import { User } from '@/lib/models/User';
import { withPatientAuth } from '@/lib/auth/rbac';
import { sendRefundNotification } from '@/lib/email';
import { sendNotification, createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';
import { getAppointmentDisplayTime, getUserTimezone } from '@/lib/timezone';

interface AppointmentResponse {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
  appointmentTime: string; // Time in patient's timezone
  appointmentTimeUTC: string; // Time in UTC
  patientTimezone?: string;
  doctorTimezone?: string;
  duration: number;
  status: string;
  topic: string;
  description?: string;
  consultationType: string;
  consultationFee: number;
  meetingLink?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/patients/appointments
 * Get all appointments for the authenticated patient
 */
export async function GET(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status'); // 'upcoming', 'completed', 'cancelled'
      const limit = parseInt(searchParams.get('limit') || '10');
      const page = parseInt(searchParams.get('page') || '1');
      const timezone = searchParams.get('timezone') || getUserTimezone();

      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        // Return demo appointments data
        const demoAppointments: AppointmentResponse[] = [
          {
            id: 'demo_1',
            doctorName: 'Dr. Sarah Johnson',
            doctorSpecialty: 'General Practice',
            appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            appointmentTime: '10:00',
            duration: 30,
            status: 'scheduled',
            topic: 'Regular checkup and consultation',
            description: 'Annual health checkup with blood work review',
            consultationType: 'video',
            consultationFee: 2,
            meetingLink: '/consultation/demo_session_1',
            sessionId: 'demo_session_1',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_2',
            doctorName: 'Dr. Michael Chen',
            doctorSpecialty: 'Cardiology',
            appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            appointmentTime: '14:30',
            duration: 30,
            status: 'completed',
            topic: 'Heart health consultation',
            description: 'Follow-up on recent ECG results',
            consultationType: 'video',
            consultationFee: 2,
            meetingLink: '/consultation/demo_session_2',
            sessionId: 'demo_session_2',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_3',
            doctorName: 'Dr. Emily Rodriguez',
            doctorSpecialty: 'Dermatology',
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: '15:00',
            duration: 30,
            status: 'scheduled',
            topic: 'Skin condition follow-up',
            description: 'Review treatment progress for eczema',
            consultationType: 'video',
            consultationFee: 2,
            meetingLink: '/consultation/demo_session_3',
            sessionId: 'demo_session_3',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        // Filter by status if provided
        const filteredAppointments = status 
          ? demoAppointments.filter(apt => {
              if (status === 'upcoming') return apt.status === 'scheduled';
              if (status === 'completed') return apt.status === 'completed';
              if (status === 'cancelled') return apt.status === 'cancelled';
              return true;
            })
          : demoAppointments;

        return NextResponse.json({
          appointments: filteredAppointments,
          pagination: {
            page: 1,
            limit: 10,
            total: filteredAppointments.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          message: 'Demo appointments data'
        });
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      // Build query
      const query: any = { patientId: patient._id };
      
      if (status) {
        if (status === 'upcoming') {
          query.status = { $in: ['scheduled', 'in_progress'] };
        } else if (status === 'completed') {
          query.status = 'completed';
        } else if (status === 'cancelled') {
          query.status = { $in: ['cancelled', 'no_show'] };
        }
      }

      // Get total count for pagination
      const total = await Appointment.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      // Fetch appointments with doctor information
      const appointments = await Appointment.find(query)
        .populate({
          path: 'doctorId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        })
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .skip(skip)
        .limit(limit);

      // Format response
      const formattedAppointments: AppointmentResponse[] = appointments.map(appointment => ({
        id: appointment._id.toString(),
        doctorName: `${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`,
        doctorSpecialty: appointment.doctorId.specialty.replace('_', ' '),
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        duration: appointment.duration,
        status: appointment.status,
        topic: appointment.topic,
        description: appointment.description,
        consultationType: appointment.consultationType,
        consultationFee: appointment.consultationFee,
        meetingLink: appointment.meetingLink,
        sessionId: appointment.sessionId,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString()
      }));

      return NextResponse.json({
        appointments: formattedAppointments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/patients/appointments
 * Cancel an appointment
 */
export async function POST(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const body = await request.json();
      const { appointmentId, action, reason } = body;

      if (!appointmentId || !action) {
        return NextResponse.json(
          { error: 'Missing required fields: appointmentId, action' },
          { status: 400 }
        );
      }

      if (action !== 'cancel') {
        return NextResponse.json(
          { error: 'Invalid action. Only "cancel" is supported' },
          { status: 400 }
        );
      }

      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        return NextResponse.json({
          message: 'Appointment cancelled successfully (demo mode)',
          appointmentId
        });
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      // Find appointment
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patientId: patient._id
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Check if appointment can be cancelled
      if (appointment.status !== 'scheduled') {
        return NextResponse.json(
          { error: 'Only scheduled appointments can be cancelled' },
          { status: 400 }
        );
      }

      // Check cancellation policy (24 hours before appointment)
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let refundCredits = false;
      if (hoursUntilAppointment >= 24) {
        refundCredits = true;
      }

      // Update appointment
      appointment.status = 'cancelled';
      appointment.cancelledBy = 'patient';
      appointment.cancellationReason = reason || 'Cancelled by patient';
      await appointment.save();

      // Refund credits if eligible
      if (refundCredits) {
        patient.creditBalance += appointment.consultationFee;
        await patient.save();

        // Send refund notification email
        try {
          await sendRefundNotification({
            patientEmail: patient.personalInfo.email,
            patientName: patient.personalInfo.fullName,
            doctorName: appointment.doctorName,
            appointmentDate: new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`).toLocaleDateString(),
            refundAmount: appointment.consultationFee,
            newBalance: patient.creditBalance,
            cancellationDate: new Date().toLocaleDateString(),
          });
        } catch (emailError) {
          console.error('Failed to send refund notification email:', emailError);
        }

        // Send in-app notifications for cancellation
        try {
          // Patient notification
          createNotification(
            patient.clerkId,
            'patient',
            NotificationType.APPOINTMENT_CANCELLED,
            'Appointment Cancelled',
            `Your appointment with ${appointment.doctorName} has been cancelled${refundCredits ? ' and credits have been refunded' : ''}.`,
            {
              priority: NotificationPriority.MEDIUM,
              actionUrl: '/dashboard/patient/appointments',
              actionLabel: 'View Appointments',
              metadata: {
                appointmentId: appointment._id.toString(),
                doctorName: appointment.doctorName,
                refunded: refundCredits,
                refundAmount: refundCredits ? appointment.consultationFee : 0,
                newBalance: patient.creditBalance
              }
            }
          );

          // Doctor notification
          const doctor = await User.findOne({
            _id: { $in: await Doctor.find({ personalInfo: { fullName: appointment.doctorName } }).distinct('userId') }
          });

          if (doctor) {
            createNotification(
              doctor.clerkId,
              'doctor',
              NotificationType.APPOINTMENT_CANCELLED,
              'Appointment Cancelled',
              `${appointment.patientName} has cancelled their appointment scheduled for ${new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`).toLocaleDateString()}.`,
              {
                priority: NotificationPriority.MEDIUM,
                actionUrl: '/dashboard/doctor/appointments',
                actionLabel: 'View Appointments',
                metadata: {
                  appointmentId: appointment._id.toString(),
                  patientName: appointment.patientName
                }
              }
            );
          }
        } catch (notificationError) {
          console.error('Failed to send cancellation notification:', notificationError);
        }
      }

      return NextResponse.json({
        message: 'Appointment cancelled successfully',
        appointmentId: appointment._id,
        refunded: refundCredits,
        refundAmount: refundCredits ? appointment.consultationFee : 0
      });

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
