'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Video,
  Phone,
  MapPin,
  CreditCard,
  Download,
  Share2,
  Bell,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentData {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  topic: string;
  description?: string;
  consultationType: 'video' | 'phone';
  status: string;
  meetingLink?: string;
  sessionId?: string;
  createdAt: string;
}

interface AppointmentConfirmationProps {
  appointment: AppointmentData;
  remainingCredits: number;
  onViewAppointments: () => void;
  onJoinConsultation?: () => void;
}

export default function AppointmentConfirmation({
  appointment,
  remainingCredits,
  onViewAppointments,
  onJoinConsultation
}: AppointmentConfirmationProps) {
  const [copied, setCopied] = useState(false);
  const [timeUntilAppointment, setTimeUntilAppointment] = useState<string>('');

  useEffect(() => {
    const updateTimeUntilAppointment = () => {
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      const now = new Date();
      const timeDiff = appointmentDateTime.getTime() - now.getTime();

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeUntilAppointment(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`);
        } else if (hours > 0) {
          setTimeUntilAppointment(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`);
        } else {
          setTimeUntilAppointment(`${minutes} minute${minutes > 1 ? 's' : ''}`);
        }
      } else {
        setTimeUntilAppointment('Appointment time has passed');
      }
    };

    updateTimeUntilAppointment();
    const interval = setInterval(updateTimeUntilAppointment, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [appointment.appointmentDate, appointment.appointmentTime]);

  const copyMeetingLink = async () => {
    if (appointment.meetingLink) {
      try {
        await navigator.clipboard.writeText(appointment.meetingLink);
        setCopied(true);
        toast.success('Meeting link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy meeting link');
      }
    }
  };

  const shareAppointment = async () => {
    const shareData = {
      title: 'Medical Appointment',
      text: `Appointment with ${appointment.doctorName} on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime}`,
      url: appointment.meetingLink || window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying to clipboard
        copyMeetingLink();
      }
    } else {
      copyMeetingLink();
    }
  };

  const downloadCalendarEvent = () => {
    const startDate = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const endDate = new Date(startDate.getTime() + appointment.duration * 60000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MedMe//Medical Appointment//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@medme.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Medical Consultation with ${appointment.doctorName}`,
      `DESCRIPTION:${appointment.topic}${appointment.description ? `\\n\\n${appointment.description}` : ''}${appointment.meetingLink ? `\\n\\nJoin consultation: ${appointment.meetingLink}` : ''}`,
      `LOCATION:${appointment.consultationType === 'video' ? 'Video Call' : 'Phone Call'}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Medical appointment reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointment-${appointment.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Calendar event downloaded');
  };

  const canJoinConsultation = () => {
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    
    // Allow joining 5 minutes before appointment time
    return timeDiff <= 5 * 60 * 1000 && timeDiff > -30 * 60 * 1000;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-800 mb-2">Appointment Confirmed!</h1>
        <p className="text-muted-foreground">
          Your appointment has been successfully booked and confirmed.
        </p>
      </motion.div>

      {/* Appointment Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Appointment Details</span>
            </CardTitle>
            <CardDescription>
              Appointment ID: {appointment.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{appointment.doctorName}</p>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">Date</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{appointment.appointmentTime}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.duration} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {appointment.consultationType === 'video' ? (
                  <Video className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Phone className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium capitalize">{appointment.consultationType} Call</p>
                  <p className="text-sm text-muted-foreground">Consultation Type</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Consultation Topic</h4>
              <p className="text-sm">{appointment.topic}</p>
              {appointment.description && (
                <>
                  <h4 className="font-medium mb-2 mt-4">Additional Details</h4>
                  <p className="text-sm text-muted-foreground">{appointment.description}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Time Until Appointment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Time Until Appointment</h3>
              <p className="text-2xl font-bold text-primary">{timeUntilAppointment}</p>
              <p className="text-sm text-muted-foreground mt-2">
                We'll send you a reminder 15 minutes before your appointment
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Meeting Link */}
      {appointment.meetingLink && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {appointment.consultationType === 'video' ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <Phone className="h-5 w-5" />
                )}
                <span>Join Consultation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <code className="flex-1 text-sm break-all">{appointment.meetingLink}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMeetingLink}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {canJoinConsultation() && onJoinConsultation && (
                <Button
                  onClick={onJoinConsultation}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Consultation Now
                </Button>
              )}

              {!canJoinConsultation() && (
                <p className="text-sm text-muted-foreground text-center">
                  You can join the consultation 5 minutes before the scheduled time
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payment Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <span>Consultation Fee</span>
              <span className="font-medium">2 credits</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span>Remaining Credits</span>
              <Badge variant="secondary">{remainingCredits} credits</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={downloadCalendarEvent}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Add to Calendar</span>
              </Button>

              <Button
                variant="outline"
                onClick={shareAppointment}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Details</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // This would typically enable notifications
                  toast.success('Appointment reminders enabled');
                }}
                className="flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>Set Reminders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="flex justify-center"
      >
        <Button onClick={onViewAppointments} className="w-full md:w-auto">
          View All Appointments
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
