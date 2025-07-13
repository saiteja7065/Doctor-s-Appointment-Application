'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Globe,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { convertUTCToLocalTime, convertLocalTimeToUTC, getUserTimezone, getTimezoneAbbreviation } from '@/lib/timezone';
import TimezoneSelector from './TimezoneSelector';
import TimezoneComparison from './TimezoneComparison';

interface TimeSlot {
  time: string; // HH:MM format in UTC
  isAvailable: boolean;
  isBooked: boolean;
  doctorLocalTime: string; // HH:MM format in doctor's timezone
}

interface TimezoneAwareSchedulerProps {
  doctorId: string;
  doctorTimezone: string;
  doctorName: string;
  availableSlots: TimeSlot[];
  selectedDate: string; // YYYY-MM-DD format
  selectedTime?: string; // HH:MM format in UTC
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTimezoneChange?: (timezone: string) => void;
  userTimezone?: string;
  showTimezoneSelector?: boolean;
  showComparison?: boolean;
  className?: string;
}

export default function TimezoneAwareScheduler({
  doctorId,
  doctorTimezone,
  doctorName,
  availableSlots,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onTimezoneChange,
  userTimezone: initialUserTimezone,
  showTimezoneSelector = true,
  showComparison = true,
  className = ""
}: TimezoneAwareSchedulerProps) {
  const [userTimezone, setUserTimezone] = useState<string>(initialUserTimezone || getUserTimezone());
  const [isLoading, setIsLoading] = useState(false);
  const [timezoneConflict, setTimezoneConflict] = useState<string | null>(null);

  // Convert available slots to user's timezone
  const localizedSlots = useMemo(() => {
    return availableSlots.map(slot => {
      const localTime = convertUTCToLocalTime(slot.time, userTimezone, new Date(selectedDate));
      return {
        ...slot,
        localTime,
        displayTime: formatTime12Hour(localTime)
      };
    }).sort((a, b) => a.localTime.localeCompare(b.localTime));
  }, [availableSlots, userTimezone, selectedDate]);

  // Check for timezone-related conflicts
  useEffect(() => {
    checkTimezoneConflicts();
  }, [userTimezone, doctorTimezone, selectedDate, selectedTime]);

  const checkTimezoneConflicts = () => {
    if (!selectedTime) {
      setTimezoneConflict(null);
      return;
    }

    try {
      // Convert selected UTC time to both timezones
      const userLocalTime = convertUTCToLocalTime(selectedTime, userTimezone, new Date(selectedDate));
      const doctorLocalTime = convertUTCToLocalTime(selectedTime, doctorTimezone, new Date(selectedDate));

      // Check if appointment is at unusual hours
      const userHour = parseInt(userLocalTime.split(':')[0]);
      const doctorHour = parseInt(doctorLocalTime.split(':')[0]);

      let conflicts = [];

      if (userHour < 6 || userHour > 22) {
        conflicts.push(`Very early/late for you (${formatTime12Hour(userLocalTime)} in your timezone)`);
      }

      if (doctorHour < 6 || doctorHour > 22) {
        conflicts.push(`Very early/late for doctor (${formatTime12Hour(doctorLocalTime)} in doctor's timezone)`);
      }

      // Check for day differences
      const userDate = new Date(`${selectedDate}T${userLocalTime}:00`);
      const doctorDate = new Date(`${selectedDate}T${doctorLocalTime}:00`);
      
      if (userDate.getDate() !== doctorDate.getDate()) {
        conflicts.push('Appointment will be on different calendar days');
      }

      setTimezoneConflict(conflicts.length > 0 ? conflicts.join('; ') : null);
    } catch (error) {
      console.error('Error checking timezone conflicts:', error);
      setTimezoneConflict(null);
    }
  };

  const handleTimezoneChange = (timezone: string) => {
    setUserTimezone(timezone);
    if (onTimezoneChange) {
      onTimezoneChange(timezone);
    }
  };

  const handleTimeSelection = (utcTime: string) => {
    onTimeChange(utcTime);
  };

  const formatTime12Hour = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      return time;
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now
    return maxDate.toISOString().split('T')[0];
  };

  const getTimeSlotVariant = (slot: any) => {
    if (!slot.isAvailable || slot.isBooked) return 'secondary';
    if (selectedTime === slot.time) return 'default';
    
    // Highlight slots at good times
    const hour = parseInt(slot.localTime.split(':')[0]);
    if (hour >= 9 && hour <= 17) return 'outline';
    
    return 'ghost';
  };

  const getTimeSlotClassName = (slot: any) => {
    const hour = parseInt(slot.localTime.split(':')[0]);
    let className = '';
    
    if (hour < 6 || hour > 22) {
      className += ' border-yellow-300 text-yellow-700';
    }
    
    if (selectedTime === slot.time) {
      className += ' ring-2 ring-primary';
    }
    
    return className;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timezone Selector */}
      {showTimezoneSelector && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TimezoneSelector
            value={userTimezone}
            onChange={handleTimezoneChange}
            showAutoDetect={true}
            showCurrentTime={true}
            showOffset={true}
          />
        </motion.div>
      )}

      {/* Date Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Select Date</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="appointmentDate">Appointment Date</Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  min={getMinDate()}
                  max={getMaxDate()}
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Timezone Information
                    </p>
                    <p className="text-blue-800 dark:text-blue-200">
                      Times shown below are in your timezone ({getTimezoneAbbreviation(userTimezone)}).
                      Doctor's timezone: {getTimezoneAbbreviation(doctorTimezone)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Time Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Available Times</span>
            </CardTitle>
            <CardDescription>
              Times shown in your timezone ({getTimezoneAbbreviation(userTimezone)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading available times...</span>
              </div>
            ) : localizedSlots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No available times for this date</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {localizedSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={getTimeSlotVariant(slot)}
                    size="sm"
                    onClick={() => handleTimeSelection(slot.time)}
                    disabled={!slot.isAvailable || slot.isBooked}
                    className={getTimeSlotClassName(slot)}
                  >
                    <div className="text-center">
                      <div className="font-medium">{slot.displayTime}</div>
                      <div className="text-xs opacity-75">
                        {formatTime12Hour(slot.doctorLocalTime)} Dr
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Timezone Conflict Warning */}
      {timezoneConflict && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Timezone Consideration
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    {timezoneConflict}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Time Comparison */}
      {showComparison && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <TimezoneComparison
            appointmentTime={convertUTCToLocalTime(selectedTime, doctorTimezone, new Date(selectedDate))}
            appointmentDate={selectedDate}
            doctorTimezone={doctorTimezone}
            patientTimezone={userTimezone}
            doctorName={doctorName}
            patientName="You"
            showWorldClock={false}
          />
        </motion.div>
      )}

      {/* Selection Summary */}
      {selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    Appointment Time Selected
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {formatTime12Hour(convertUTCToLocalTime(selectedTime, userTimezone, new Date(selectedDate)))} ({getTimezoneAbbreviation(userTimezone)})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
