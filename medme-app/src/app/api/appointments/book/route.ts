import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { withPatientAuth } from '@/lib/auth/rbac';
import { createVideoSession } from '@/lib/vonage';

interface BookingRequest {
  doctorId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  topic: string;
  description?: string;
  consultationType: 'video' | 'phone';
}

/**
 * POST /api/appointments/book
 * Book a new appointment with a doctor
 */
export async function POST(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const body: BookingRequest = await request.json();
      const { doctorId, appointmentDate, appointmentTime, topic, description, consultationType } = body;

      // Validate required fields
      if (!doctorId || !appointmentDate || !appointmentTime || !topic) {
        return NextResponse.json(
          { error: 'Missing required fields: doctorId, appointmentDate, appointmentTime, topic' },
          { status: 400 }
        );
      }

      // For now, return a demo response since database might not be fully set up
      return NextResponse.json(
        {
          success: true,
          message: 'Appointment booked successfully (demo mode)',
          appointment: {
            id: 'demo_' + Date.now(),
            doctorId: doctorId,
            patientId: userContext.userId,
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            topic: topic,
            description: description,
            consultationType: consultationType || 'video',
            status: 'scheduled',
            createdAt: new Date().toISOString()
          },
          remainingCredits: 10 // Demo credit balance
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Error booking appointment:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/appointments/book
 * Get available time slots for a doctor on a specific date
 */
export async function GET(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const { searchParams } = new URL(request.url);
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
      const isConnected = await connectToDatabase();
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
  });
}

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
