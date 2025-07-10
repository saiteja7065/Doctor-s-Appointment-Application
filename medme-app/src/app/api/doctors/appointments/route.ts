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

// GET - Fetch doctor's appointments
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo appointments data
      console.log('Database not available, returning demo appointments data');
      
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
      
      return NextResponse.json(
        {
          appointments: paginatedAppointments,
          total: filteredAppointments.length,
          hasMore: offset + limit < filteredAppointments.length,
          message: 'Demo appointments data'
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
    // For now, return demo data even when database is connected
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

    return NextResponse.json(
      {
        appointments: paginatedAppointments,
        total: filteredAppointments.length,
        hasMore: offset + limit < filteredAppointments.length,
        doctorId: doctor._id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new appointment (for future use)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      patientId,
      appointmentDate,
      appointmentTime,
      duration,
      topic,
      description,
      consultationType
    } = body;

    // Validate required fields
    if (!patientId || !appointmentDate || !appointmentTime || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for appointment creation');
      return NextResponse.json(
        {
          message: 'Appointment created successfully (demo mode)',
          appointment: {
            id: 'demo_' + Date.now(),
            patientId,
            appointmentDate,
            appointmentTime,
            duration: duration || 30,
            topic,
            description,
            consultationType: consultationType || 'video',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        { status: 201 }
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

    // TODO: Implement actual appointment creation in database
    // For now, return demo response
    return NextResponse.json(
      {
        message: 'Appointment created successfully (demo mode)',
        appointment: {
          id: 'demo_' + Date.now(),
          patientId,
          appointmentDate,
          appointmentTime,
          duration: duration || 30,
          topic,
          description,
          consultationType: consultationType || 'video',
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
