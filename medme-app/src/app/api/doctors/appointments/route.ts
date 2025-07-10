import { NextRequest, NextResponse } from 'next/server';
import { withDoctorAuth, UserContext } from '@/lib/auth/rbac';
import { Doctor } from '@/lib/models/Doctor';
import Appointment, { AppointmentStatus } from '@/lib/models/Appointment';

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

// Demo appointments data
const DEMO_APPOINTMENTS = [
  {
    id: '1',
    patientId: 'patient_1',
    patientName: 'Sarah Johnson',
    patientEmail: 'sarah.johnson@email.com',
    appointmentDate: new Date().toISOString().split('T')[0], // Today
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
  {
    id: '2',
    patientId: 'patient_2',
    patientName: 'Michael Chen',
    patientEmail: 'michael.chen@email.com',
    appointmentDate: new Date().toISOString().split('T')[0], // Today
    appointmentTime: '14:30',
    duration: 45,
    status: 'scheduled',
    topic: 'Cardiology Consultation',
    description: 'Chest pain evaluation and ECG review',
    consultationType: 'video',
    consultationFee: 2,
    meetingLink: 'https://meet.medme.com/room/def456',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    patientId: 'patient_3',
    patientName: 'Emily Davis',
    patientEmail: 'emily.davis@email.com',
    appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    appointmentTime: '16:00',
    duration: 30,
    status: 'completed',
    topic: 'Dermatology Consultation',
    description: 'Skin rash examination',
    consultationType: 'video',
    consultationFee: 2,
    notes: 'Prescribed topical cream. Follow-up in 2 weeks.',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    patientId: 'patient_4',
    patientName: 'David Wilson',
    patientEmail: 'david.wilson@email.com',
    appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    appointmentTime: '11:00',
    duration: 30,
    status: 'no-show',
    topic: 'General Consultation',
    description: 'Routine check-up',
    consultationType: 'video',
    consultationFee: 2,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    patientId: 'patient_5',
    patientName: 'Lisa Anderson',
    patientEmail: 'lisa.anderson@email.com',
    appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    appointmentTime: '09:30',
    duration: 30,
    status: 'scheduled',
    topic: 'Pediatric Consultation',
    description: 'Child wellness check-up',
    consultationType: 'video',
    consultationFee: 2,
    meetingLink: 'https://meet.medme.com/room/ghi789',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * GET /api/doctors/appointments
 * Get all appointments for the authenticated doctor
 */
async function handleGET(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    // Get doctor profile
    const doctor = await Doctor.findOne({ clerkId: userContext.clerkId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    const query: Record<string, unknown> = { doctorId: doctor._id };
    if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      query.status = status;
    }
    if (date) {
      query.appointmentDate = date;
    }

    // Get appointments with pagination
    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Get total count for pagination
    const totalCount = await Appointment.countDocuments(query);

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      status: appointment.status,
      topic: appointment.topic,
      description: appointment.description,
      consultationType: appointment.consultationType,
      consultationFee: appointment.consultationFee,
      paymentStatus: appointment.paymentStatus,
      meetingLink: appointment.meetingLink,
      notes: appointment.notes,
      rating: appointment.rating,
      review: appointment.review,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }));

    return NextResponse.json(
      {
        appointments: formattedAppointments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        doctorId: doctor._id,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET with demo fallback
 */
async function handleGETWithFallback(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    return await handleGET(userContext, request);
  } catch (error) {
    console.error('Database error, falling back to demo data:', error);

    // Parse query parameters for demo filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let filteredAppointments = [...DEMO_APPOINTMENTS];

    // Apply filters
    if (status && status !== 'all') {
      filteredAppointments = filteredAppointments.filter(apt => apt.status === status);
    }

    if (date) {
      filteredAppointments = filteredAppointments.filter(apt => apt.appointmentDate === date);
    }

    // Apply pagination
    const paginatedAppointments = filteredAppointments.slice(offset, offset + limit);
      
    // Return demo appointments when database is not available
    return NextResponse.json(
      {
        appointments: paginatedAppointments,
        pagination: {
          total: filteredAppointments.length,
          limit,
          offset,
          hasMore: offset + limit < filteredAppointments.length,
        },
        message: 'Demo mode - database not available'
      },
      { status: 200 }
    );
  }
}

// Export with RBAC protection
export const GET = withDoctorAuth(handleGETWithFallback);
