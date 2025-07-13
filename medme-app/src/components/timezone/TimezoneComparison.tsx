'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Clock,
  User,
  Stethoscope,
  ArrowRight,
  Calendar,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { getTimezoneAbbreviation, convertAppointmentTime } from '@/lib/timezone';

interface TimezoneComparisonProps {
  appointmentTime: string; // HH:MM format
  appointmentDate: string; // YYYY-MM-DD format
  doctorTimezone: string;
  patientTimezone: string;
  doctorName?: string;
  patientName?: string;
  showWorldClock?: boolean;
  className?: string;
}

interface TimeInfo {
  time: string;
  date: string;
  timezone: string;
  abbreviation: string;
  dayDifference: number;
}

export default function TimezoneComparison({
  appointmentTime,
  appointmentDate,
  doctorTimezone,
  patientTimezone,
  doctorName = "Doctor",
  patientName = "Patient",
  showWorldClock = false,
  className = ""
}: TimezoneComparisonProps) {
  const [doctorTime, setDoctorTime] = useState<TimeInfo | null>(null);
  const [patientTime, setPatientTime] = useState<TimeInfo | null>(null);
  const [worldTimes, setWorldTimes] = useState<Array<{ timezone: string; time: string; date: string; abbr: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const majorTimezones = [
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  useEffect(() => {
    calculateTimes();
  }, [appointmentTime, appointmentDate, doctorTimezone, patientTimezone]);

  const calculateTimes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate doctor's time (assuming appointment time is in doctor's timezone)
      const doctorTimeInfo: TimeInfo = {
        time: appointmentTime,
        date: appointmentDate,
        timezone: doctorTimezone,
        abbreviation: getTimezoneAbbreviation(doctorTimezone),
        dayDifference: 0
      };

      // Convert to patient's timezone
      const patientConversion = convertAppointmentTime(
        appointmentTime,
        appointmentDate,
        doctorTimezone,
        patientTimezone
      );

      const patientTimeInfo: TimeInfo = {
        time: patientConversion.time,
        date: patientConversion.date,
        timezone: patientTimezone,
        abbreviation: getTimezoneAbbreviation(patientTimezone),
        dayDifference: calculateDayDifference(appointmentDate, patientConversion.date)
      };

      setDoctorTime(doctorTimeInfo);
      setPatientTime(patientTimeInfo);

      // Calculate world times if requested
      if (showWorldClock) {
        const worldTimePromises = majorTimezones
          .filter(tz => tz !== doctorTimezone && tz !== patientTimezone)
          .map(async (timezone) => {
            try {
              const conversion = convertAppointmentTime(
                appointmentTime,
                appointmentDate,
                doctorTimezone,
                timezone
              );
              
              return {
                timezone,
                time: conversion.time,
                date: conversion.date,
                abbr: getTimezoneAbbreviation(timezone)
              };
            } catch (error) {
              console.error(`Error converting to ${timezone}:`, error);
              return null;
            }
          });

        const worldTimeResults = await Promise.all(worldTimePromises);
        setWorldTimes(worldTimeResults.filter(Boolean) as any[]);
      }
    } catch (error) {
      console.error('Error calculating times:', error);
      setError('Failed to calculate timezone conversions');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDayDifference = (originalDate: string, convertedDate: string): number => {
    const original = new Date(originalDate);
    const converted = new Date(convertedDate);
    const diffTime = converted.getTime() - original.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };

  const getDayDifferenceText = (dayDiff: number): string => {
    if (dayDiff === 0) return '';
    if (dayDiff === 1) return '(+1 day)';
    if (dayDiff === -1) return '(-1 day)';
    if (dayDiff > 1) return `(+${dayDiff} days)`;
    return `(${dayDiff} days)`;
  };

  const getDayDifferenceColor = (dayDiff: number): string => {
    if (dayDiff === 0) return '';
    return dayDiff > 0 ? 'text-blue-600' : 'text-orange-600';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Calculating timezone conversions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Appointment Time Comparison</span>
          </CardTitle>
          <CardDescription>
            Time shown in each participant's timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Doctor's Time */}
          {doctorTime && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{doctorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {doctorTime.timezone.split('/').pop()?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold">
                    {formatTime12Hour(doctorTime.time)}
                  </span>
                  <Badge variant="outline">
                    {doctorTime.abbreviation}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(doctorTime.date)}
                </p>
              </div>
            </motion.div>
          )}

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Patient's Time */}
          {patientTime && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {patientTime.timezone.split('/').pop()?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold">
                    {formatTime12Hour(patientTime.time)}
                  </span>
                  <Badge variant="outline">
                    {patientTime.abbreviation}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    {formatDate(patientTime.date)}
                  </p>
                  {patientTime.dayDifference !== 0 && (
                    <span className={`text-xs font-medium ${getDayDifferenceColor(patientTime.dayDifference)}`}>
                      {getDayDifferenceText(patientTime.dayDifference)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Day Difference Warning */}
          {patientTime && patientTime.dayDifference !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg"
            >
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Different Days
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200">
                    The appointment will be on different calendar days for the doctor and patient
                    due to timezone differences.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* World Clock */}
      {showWorldClock && worldTimes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>World Times</span>
              </CardTitle>
              <CardDescription>
                Appointment time in major timezones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {worldTimes.map((worldTime) => (
                  <div
                    key={worldTime.timezone}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {worldTime.timezone.split('/').pop()?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(worldTime.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatTime12Hour(worldTime.time)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {worldTime.abbr}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg"
      >
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Timezone Information
            </p>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              All times are automatically converted to each participant's local timezone.
              Please ensure you join at the correct time for your timezone.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
