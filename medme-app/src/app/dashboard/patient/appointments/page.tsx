'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Video,
  Plus,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { TimezoneDisplay } from '@/components/ui/timezone-display';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: 'video' | 'in-person';
  description: string;
  sessionId?: string;
  meetingLink?: string;
}

export default function AppointmentsPage() {
  const { user, isLoaded } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/patients/appointments');

        if (response.ok) {
          const data = await response.json();

          // Transform API response to match component interface
          const transformedAppointments: Appointment[] = data.appointments.map((apt: any) => ({
            id: apt.id,
            doctorName: apt.doctorName,
            specialty: apt.doctorSpecialty,
            date: apt.appointmentDate,
            time: formatTime(apt.appointmentTime),
            status: apt.status === 'scheduled' ? 'upcoming' : apt.status,
            type: apt.consultationType,
            description: apt.topic + (apt.description ? ` - ${apt.description}` : ''),
            sessionId: apt.sessionId,
            meetingLink: apt.meetingLink
          }));

          setAppointments(transformedAppointments);
        } else {
          // Fallback to demo data if API fails
          const mockAppointments: Appointment[] = [
            {
              id: '1',
              doctorName: 'Dr. Sarah Johnson',
              specialty: 'General Practice',
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: '10:00 AM',
              status: 'upcoming',
              type: 'video',
              description: 'Regular checkup and consultation',
              sessionId: 'demo_session_1',
              meetingLink: '/consultation/demo_session_1'
            },
            {
              id: '2',
              doctorName: 'Dr. Michael Chen',
              specialty: 'Cardiology',
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: '2:30 PM',
              status: 'completed',
              type: 'video',
              description: 'Heart health consultation',
              sessionId: 'demo_session_2',
              meetingLink: '/consultation/demo_session_2'
            }
          ];

          setAppointments(mockAppointments);
        }
      } catch (error) {
        console.error('Error loading appointments:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      loadAppointments();
    }
  }, [isLoaded, user]);

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filteredAppointments = appointments.filter(appointment => 
    filter === 'all' || appointment.status === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canJoinCall = (appointment: Appointment) => {
    if (appointment.status !== 'upcoming' || appointment.type !== 'video') {
      return false;
    }

    // Check if appointment is today and within 15 minutes of start time
    const appointmentDate = new Date(appointment.date);
    const today = new Date();

    // For demo purposes, allow joining if it's today or tomorrow
    const daysDiff = Math.floor((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 1;
  };

  const handleJoinCall = (appointment: Appointment) => {
    if (appointment.meetingLink) {
      window.open(appointment.meetingLink, '_blank');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Appointments</h1>
            <p className="text-muted-foreground mt-2">
              Manage your healthcare appointments
            </p>
          </div>
          <Link href="/dashboard/patient/doctors">
            <Button className="mt-4 sm:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Book New Appointment
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'upcoming', 'completed', 'cancelled'].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status as any)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appointments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No appointments found
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? "You haven't booked any appointments yet."
                  : `No ${filter} appointments found.`
                }
              </p>
              <Link href="/dashboard/patient/doctors">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Book Your First Appointment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="glass-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">
                          {appointment.doctorName}
                        </h3>
                        <Badge variant="secondary">
                          {appointment.specialty}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <TimezoneDisplay
                            time={appointment.time.includes(':') ? appointment.time.split(' ')[0] : appointment.time}
                            date={appointment.date}
                            showTimezone={true}
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                        <div className="flex items-center space-x-1">
                          <Video className="h-4 w-4" />
                          <span className="capitalize">{appointment.type}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {appointment.description}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>

                        {canJoinCall(appointment) && (
                          <Button
                            size="sm"
                            onClick={() => handleJoinCall(appointment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Call
                          </Button>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
