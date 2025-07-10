'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe } from 'lucide-react';

interface TimezoneDisplayProps {
  time: string; // HH:MM format
  date?: string; // YYYY-MM-DD format
  timezone?: string;
  showTimezone?: boolean;
  showIcon?: boolean;
  format?: '12h' | '24h';
  className?: string;
}

export function TimezoneDisplay({
  time,
  date,
  timezone,
  showTimezone = true,
  showIcon = false,
  format = '12h',
  className = ''
}: TimezoneDisplayProps) {
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [formattedTime, setFormattedTime] = useState<string>(time);
  const [timezoneAbbr, setTimezoneAbbr] = useState<string>('');

  useEffect(() => {
    // Get user's timezone
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(detectedTimezone);
    } catch (error) {
      console.error('Error detecting timezone:', error);
      setUserTimezone('UTC');
    }
  }, []);

  useEffect(() => {
    // Format time based on timezone and format preference
    try {
      const targetTimezone = timezone || userTimezone;
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create a date object for the time
      const timeDate = date ? new Date(`${date}T${time}:00`) : new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      // Format time according to preferences
      const formatOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: format === '12h',
        timeZone: targetTimezone
      };
      
      const formatted = new Intl.DateTimeFormat('en-US', formatOptions).format(timeDate);
      setFormattedTime(formatted);
      
      // Get timezone abbreviation
      if (showTimezone) {
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: targetTimezone,
          timeZoneName: 'short'
        });
        
        const parts = tzFormatter.formatToParts(timeDate);
        const timeZonePart = parts.find(part => part.type === 'timeZoneName');
        setTimezoneAbbr(timeZonePart?.value || targetTimezone);
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      setFormattedTime(time);
      setTimezoneAbbr(timezone || userTimezone);
    }
  }, [time, date, timezone, userTimezone, format, showTimezone]);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && <Clock className="h-4 w-4 text-muted-foreground" />}
      <span className="font-medium">{formattedTime}</span>
      {showTimezone && (
        <Badge variant="outline" className="text-xs">
          {timezoneAbbr}
        </Badge>
      )}
    </div>
  );
}

interface TimezoneConverterProps {
  time: string; // HH:MM format
  date?: string; // YYYY-MM-DD format
  fromTimezone: string;
  toTimezone?: string;
  showBoth?: boolean;
  className?: string;
}

export function TimezoneConverter({
  time,
  date,
  fromTimezone,
  toTimezone,
  showBoth = false,
  className = ''
}: TimezoneConverterProps) {
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [convertedTime, setConvertedTime] = useState<string>(time);
  const [originalTime, setOriginalTime] = useState<string>(time);

  useEffect(() => {
    // Get user's timezone
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(detectedTimezone);
    } catch (error) {
      console.error('Error detecting timezone:', error);
      setUserTimezone('UTC');
    }
  }, []);

  useEffect(() => {
    // Convert time between timezones
    try {
      const targetTimezone = toTimezone || userTimezone;
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create a date object in the source timezone
      const sourceDate = date ? new Date(`${date}T${time}:00`) : new Date();
      sourceDate.setHours(hours, minutes, 0, 0);
      
      // Format original time
      const originalFormatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: fromTimezone
      }).format(sourceDate);
      setOriginalTime(originalFormatted);
      
      // Format converted time
      const convertedFormatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: targetTimezone
      }).format(sourceDate);
      setConvertedTime(convertedFormatted);
      
    } catch (error) {
      console.error('Error converting time:', error);
      setOriginalTime(time);
      setConvertedTime(time);
    }
  }, [time, date, fromTimezone, toTimezone, userTimezone]);

  if (showBoth) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-1">
          <span className="font-medium">{originalTime}</span>
          <Badge variant="outline" className="text-xs">
            {getTimezoneAbbr(fromTimezone)}
          </Badge>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center space-x-1">
          <span className="font-medium">{convertedTime}</span>
          <Badge variant="outline" className="text-xs">
            {getTimezoneAbbr(toTimezone || userTimezone)}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <TimezoneDisplay
      time={convertedTime}
      date={date}
      timezone={toTimezone || userTimezone}
      className={className}
    />
  );
}

interface WorldClockProps {
  time: string; // HH:MM format
  date?: string; // YYYY-MM-DD format
  timezones: string[];
  className?: string;
}

export function WorldClock({
  time,
  date,
  timezones,
  className = ''
}: WorldClockProps) {
  const [times, setTimes] = useState<Array<{ timezone: string; time: string; abbr: string }>>([]);

  useEffect(() => {
    // Calculate time for each timezone
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const baseDate = date ? new Date(`${date}T${time}:00`) : new Date();
      baseDate.setHours(hours, minutes, 0, 0);
      
      const calculatedTimes = timezones.map(tz => {
        const formatted = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: tz
        }).format(baseDate);
        
        return {
          timezone: tz,
          time: formatted,
          abbr: getTimezoneAbbr(tz)
        };
      });
      
      setTimes(calculatedTimes);
    } catch (error) {
      console.error('Error calculating world times:', error);
      setTimes([]);
    }
  }, [time, date, timezones]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>World Times</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {times.map(({ timezone, time: tzTime, abbr }) => (
          <div key={timezone} className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-sm">{timezone.split('/').pop()?.replace('_', ' ')}</span>
            <div className="flex items-center space-x-1">
              <span className="font-medium">{tzTime}</span>
              <Badge variant="outline" className="text-xs">
                {abbr}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to get timezone abbreviation
function getTimezoneAbbr(timezone: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart?.value || timezone.split('/').pop() || timezone;
  } catch (error) {
    return timezone.split('/').pop() || timezone;
  }
}

export default TimezoneDisplay;
