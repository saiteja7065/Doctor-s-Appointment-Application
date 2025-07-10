/**
 * Timezone utility functions for handling doctor availability and appointment scheduling
 * All times are stored in UTC and converted to local timezone for display
 */

export interface TimeSlotUTC {
  dayOfWeek: number; // 0-6 (Sunday-Saturday) in UTC
  startTimeUTC: string; // HH:MM format in UTC
  endTimeUTC: string; // HH:MM format in UTC
  isAvailable: boolean;
  originalTimezone: string; // Doctor's timezone when setting availability
}

export interface LocalTimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday) in local timezone
  startTime: string; // HH:MM format in local timezone
  endTime: string; // HH:MM format in local timezone
  isAvailable: boolean;
  timezone: string; // Local timezone
}

/**
 * Convert local time to UTC
 */
export function convertLocalTimeToUTC(
  localTime: string, // HH:MM format
  localTimezone: string,
  date?: Date // Optional date for DST handling
): string {
  try {
    // Use current date if not provided
    const referenceDate = date || new Date();
    
    // Create a date object with the local time in the specified timezone
    const [hours, minutes] = localTime.split(':').map(Number);
    
    // Create date in local timezone
    const localDateTime = new Date(referenceDate);
    localDateTime.setHours(hours, minutes, 0, 0);
    
    // Convert to UTC using Intl.DateTimeFormat
    const utcTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(localDateTime);
    
    // Calculate timezone offset
    const localOffset = getTimezoneOffset(localTimezone, referenceDate);
    const utcOffset = 0; // UTC has no offset
    
    const offsetDiff = localOffset - utcOffset;
    
    // Adjust time by offset difference
    const adjustedTime = new Date(localDateTime.getTime() - (offsetDiff * 60 * 1000));
    
    const utcHours = adjustedTime.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = adjustedTime.getUTCMinutes().toString().padStart(2, '0');
    
    return `${utcHours}:${utcMinutes}`;
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    return localTime; // Fallback to original time
  }
}

/**
 * Convert UTC time to local timezone
 */
export function convertUTCToLocalTime(
  utcTime: string, // HH:MM format
  targetTimezone: string,
  date?: Date // Optional date for DST handling
): string {
  try {
    // Use current date if not provided
    const referenceDate = date || new Date();
    
    // Create a UTC date object with the UTC time
    const [hours, minutes] = utcTime.split(':').map(Number);
    
    const utcDateTime = new Date(referenceDate);
    utcDateTime.setUTCHours(hours, minutes, 0, 0);
    
    // Convert to target timezone
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(utcDateTime);
    
    return localTime;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return utcTime; // Fallback to original time
  }
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string, date?: Date): number {
  try {
    const referenceDate = date || new Date();
    
    // Get UTC time
    const utcTime = new Date(referenceDate.toISOString());
    
    // Get time in target timezone
    const localTime = new Date(referenceDate.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate offset in minutes
    const offsetMs = utcTime.getTime() - localTime.getTime();
    return Math.round(offsetMs / (1000 * 60));
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return 0; // Fallback to UTC
  }
}

/**
 * Convert doctor's local availability to UTC
 */
export function convertAvailabilityToUTC(
  localAvailability: LocalTimeSlot[],
  doctorTimezone: string
): TimeSlotUTC[] {
  return localAvailability.map(slot => {
    const startTimeUTC = convertLocalTimeToUTC(slot.startTime, doctorTimezone);
    const endTimeUTC = convertLocalTimeToUTC(slot.endTime, doctorTimezone);
    
    return {
      dayOfWeek: slot.dayOfWeek,
      startTimeUTC,
      endTimeUTC,
      isAvailable: slot.isAvailable,
      originalTimezone: doctorTimezone
    };
  });
}

/**
 * Convert UTC availability to local timezone for display
 */
export function convertAvailabilityToLocal(
  utcAvailability: TimeSlotUTC[],
  targetTimezone: string
): LocalTimeSlot[] {
  return utcAvailability.map(slot => {
    const startTime = convertUTCToLocalTime(slot.startTimeUTC, targetTimezone);
    const endTime = convertUTCToLocalTime(slot.endTimeUTC, targetTimezone);
    
    return {
      dayOfWeek: slot.dayOfWeek,
      startTime,
      endTime,
      isAvailable: slot.isAvailable,
      timezone: targetTimezone
    };
  });
}

/**
 * Get user's timezone from browser
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'UTC'; // Fallback to UTC
  }
}

/**
 * Format time for display with timezone
 */
export function formatTimeWithTimezone(
  time: string, // HH:MM format
  timezone: string,
  options?: {
    showTimezone?: boolean;
    use12Hour?: boolean;
  }
): string {
  try {
    const { showTimezone = false, use12Hour = true } = options || {};
    
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
      timeZone: timezone
    };
    
    if (showTimezone) {
      formatOptions.timeZoneName = 'short';
    }
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  } catch (error) {
    console.error('Error formatting time with timezone:', error);
    return time;
  }
}

/**
 * Check if two timezones are the same (accounting for aliases)
 */
export function areTimezonesEqual(tz1: string, tz2: string): boolean {
  try {
    const date = new Date();
    const time1 = new Intl.DateTimeFormat('en-US', {
      timeZone: tz1,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    
    const time2 = new Intl.DateTimeFormat('en-US', {
      timeZone: tz2,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    
    return time1 === time2;
  } catch (error) {
    return tz1 === tz2;
  }
}

/**
 * Get common timezone abbreviations
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of common timezones for selection
 */
export function getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland',
    'UTC'
  ];
  
  return commonTimezones.map(tz => {
    const offset = getTimezoneOffset(tz);
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    
    return {
      value: tz,
      label: tz.replace('_', ' '),
      offset: `UTC${offsetString}`
    };
  });
}
