import { NextRequest, NextResponse } from 'next/server';
import { withDoctorAuth, UserContext } from '@/lib/auth/rbac';
import { Doctor } from '@/lib/models/Doctor';
import { connectToMongoose } from '@/lib/mongodb';
import {
  convertAvailabilityToUTC,
  convertAvailabilityToLocal,
  LocalTimeSlot,
  TimeSlotUTC,
  isValidTimezone,
  getUserTimezone
} from '@/lib/timezone';

async function handleGET(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const targetTimezone = searchParams.get('timezone') || getUserTimezone();

    // Validate timezone
    if (!isValidTimezone(targetTimezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      // Return demo availability data
      const demoAvailability: LocalTimeSlot[] = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          timezone: targetTimezone
        },
        {
          dayOfWeek: 2, // Tuesday
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          timezone: targetTimezone
        },
        {
          dayOfWeek: 3, // Wednesday
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          timezone: targetTimezone
        },
        {
          dayOfWeek: 4, // Thursday
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          timezone: targetTimezone
        },
        {
          dayOfWeek: 5, // Friday
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          timezone: targetTimezone
        }
      ];

      return NextResponse.json({
        availability: demoAvailability,
        timezone: targetTimezone,
        message: 'Demo availability data'
      });
    }

    const doctor = await Doctor.findOne({ clerkId: userContext.clerkId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Convert UTC availability to target timezone
    const utcAvailability: TimeSlotUTC[] = doctor.availability.map(slot => ({
      dayOfWeek: slot.dayOfWeek,
      startTimeUTC: slot.startTime,
      endTimeUTC: slot.endTime,
      isAvailable: slot.isAvailable,
      originalTimezone: slot.originalTimezone || doctor.timeZone
    }));

    const localAvailability = convertAvailabilityToLocal(utcAvailability, targetTimezone);

    return NextResponse.json({
      availability: localAvailability,
      timezone: targetTimezone,
      doctorTimezone: doctor.timeZone,
      doctorId: doctor._id,
      verificationStatus: doctor.verificationStatus
    });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePOST(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { availability, timezone } = body;

    // Validate input
    if (!availability || !Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability data' },
        { status: 400 }
      );
    }

    if (!timezone || !isValidTimezone(timezone)) {
      return NextResponse.json(
        { error: 'Invalid or missing timezone' },
        { status: 400 }
      );
    }

    // Validate availability slots
    for (const slot of availability) {
      if (
        typeof slot.dayOfWeek !== 'number' ||
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6 ||
        !slot.startTime ||
        !slot.endTime ||
        typeof slot.isAvailable !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Invalid availability slot format' },
          { status: 400 }
        );
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM' },
          { status: 400 }
        );
      }

      // Validate that start time is before end time
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        return NextResponse.json(
          { error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        message: 'Availability updated successfully (demo mode)',
        availability,
        timezone
      });
    }

    const doctor = await Doctor.findOne({ clerkId: userContext.clerkId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Convert local availability to UTC
    const utcAvailability = convertAvailabilityToUTC(availability, timezone);

    // Update doctor's availability and timezone
    doctor.availability = utcAvailability.map(slot => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTimeUTC,
      endTime: slot.endTimeUTC,
      isAvailable: slot.isAvailable,
      originalTimezone: timezone
    }));

    doctor.timeZone = timezone;
    await doctor.save();

    return NextResponse.json({
      message: 'Availability updated successfully',
      availability: utcAvailability,
      timezone,
      storedInUTC: true
    });
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withDoctorAuth(handleGET);
export const POST = withDoctorAuth(handlePOST);
