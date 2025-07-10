'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  User, 
  Video,
  Phone,
  MessageSquare,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientAvatar?: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'in-progress';
  topic: string;
  description?: string;
  consultationType: 'video' | 'phone' | 'chat';
  consultationFee: number;
  meetingLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const APPOINTMENT_STATUSES = [
  { value: 'all', label: 'All Appointments', color: 'default' },
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in-progress', label: 'In Progress', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'no-show', label: 'No Show', color: 'orange' },
];

const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    patientId: 'patient_1',
    patientName: 'Sarah Johnson',
    patientEmail: 'sarah.johnson@email.com',
    appointmentDate: '2025-01-09',
    appointmentTime: '10:00',
    duration: 30,
    status: 'scheduled',
    topic: 'General Consultation',
    description: 'Follow-up on recent blood work results',
    consultationType: 'video',
    consultationFee: 2,
    meetingLink: 'https://meet.medme.com/room/abc123',
    createdAt: '2025-01-08T10:00:00Z',
    updatedAt: '2025-01-08T10:00:00Z'
  },
  {
    id: '2',
    patientId: 'patient_2',
    patientName: 'Michael Chen',
    patientEmail: 'michael.chen@email.com',
    appointmentDate: '2025-01-09',
    appointmentTime: '14:30',
    duration: 45,
    status: 'scheduled',
    topic: 'Cardiology Consultation',
    description: 'Chest pain evaluation and ECG review',
    consultationType: 'video',
    consultationFee: 2,
    meetingLink: 'https://meet.medme.com/room/def456',
    createdAt: '2025-01-08T14:00:00Z',
    updatedAt: '2025-01-08T14:00:00Z'
  },
  {
    id: '3',
    patientId: 'patient_3',
    patientName: 'Emily Davis',
    patientEmail: 'emily.davis@email.com',
    appointmentDate: '2025-01-08',
    appointmentTime: '16:00',
    duration: 30,
    status: 'completed',
    topic: 'Dermatology Consultation',
    description: 'Skin rash examination',
    consultationType: 'video',
    consultationFee: 2,
    notes: 'Prescribed topical cream. Follow-up in 2 weeks.',
    createdAt: '2025-01-07T16:00:00Z',
    updatedAt: '2025-01-08T16:30:00Z'
  },
  {
    id: '4',
    patientId: 'patient_4',
    patientName: 'David Wilson',
    patientEmail: 'david.wilson@email.com',
    appointmentDate: '2025-01-08',
    appointmentTime: '11:00',
    duration: 30,
    status: 'no-show',
    topic: 'General Consultation',
    description: 'Routine check-up',
    consultationType: 'video',
    consultationFee: 2,
    createdAt: '2025-01-07T11:00:00Z',
    updatedAt: '2025-01-08T11:30:00Z'
  }
];

export default function DoctorAppointmentsPage() {
  const { user } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchQuery, statusFilter, dateFilter, activeTab]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/doctors/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        // Demo mode - use demo data
        setAppointments(DEMO_APPOINTMENTS);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments(DEMO_APPOINTMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(appointment =>
        appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patientEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Filter by date/tab
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(appointment => appointment.appointmentDate === today);
        break;
      case 'upcoming':
        filtered = filtered.filter(appointment => 
          appointment.appointmentDate >= today && 
          ['scheduled', 'in-progress'].includes(appointment.status)
        );
        break;
      case 'completed':
        filtered = filtered.filter(appointment => appointment.status === 'completed');
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateTimeB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateTimeB.getTime() - dateTimeA.getTime();
    });

    setFilteredAppointments(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES.find(s => s.value === status);
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <Badge variant="outline" className={colors[statusConfig?.color as keyof typeof colors] || colors.default}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'no-show':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'in-progress':
        return <Video className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const joinConsultation = (appointment: Appointment) => {
    if (appointment.meetingLink) {
      window.open(appointment.meetingLink, '_blank');
      toast.success('Joining consultation...');
    } else {
      toast.error('Meeting link not available');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/doctors/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
        ));
        toast.success('Appointment status updated');
      } else {
        // Demo mode - update locally
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
        ));
        toast.success('Appointment status updated (demo mode)');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  };

  const getTabCounts = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      today: appointments.filter(apt => apt.appointmentDate === today).length,
      upcoming: appointments.filter(apt => 
        apt.appointmentDate >= today && 
        ['scheduled', 'in-progress'].includes(apt.status)
      ).length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      all: appointments.length
    };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabCounts = getTabCounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground">
              Manage your patient consultations and schedule
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search patients, topics, or emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appointments Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today" className="flex items-center space-x-2">
              <span>Today</span>
              {tabCounts.today > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tabCounts.today}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center space-x-2">
              <span>Upcoming</span>
              {tabCounts.upcoming > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tabCounts.upcoming}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2">
              <span>Completed</span>
              {tabCounts.completed > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tabCounts.completed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <span>All</span>
              {tabCounts.all > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tabCounts.all}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No appointments found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your filters to see more appointments.'
                      : 'You don\'t have any appointments scheduled yet.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <Card key={appointment.id} className="glass-card hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={appointment.patientAvatar} />
                            <AvatarFallback>
                              {appointment.patientName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {appointment.patientName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.patientEmail}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(appointment.status)}
                                {getStatusBadge(appointment.status)}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(appointment.appointmentDate)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(appointment.appointmentTime)}</span>
                                <span>({appointment.duration} min)</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {appointment.consultationType === 'video' && <Video className="w-4 h-4" />}
                                {appointment.consultationType === 'phone' && <Phone className="w-4 h-4" />}
                                {appointment.consultationType === 'chat' && <MessageSquare className="w-4 h-4" />}
                                <span className="capitalize">{appointment.consultationType}</span>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-foreground">{appointment.topic}</h4>
                              {appointment.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {appointment.description}
                                </p>
                              )}
                              {appointment.notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                  <strong>Notes:</strong> {appointment.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {appointment.status === 'scheduled' && appointment.meetingLink && (
                            <Button
                              onClick={() => joinConsultation(appointment)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Call
                            </Button>
                          )}
                          
                          {appointment.status === 'scheduled' && (
                            <Select onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}>
                              <SelectTrigger className="w-32">
                                <MoreHorizontal className="w-4 h-4" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in-progress">Start</SelectItem>
                                <SelectItem value="completed">Complete</SelectItem>
                                <SelectItem value="cancelled">Cancel</SelectItem>
                                <SelectItem value="no-show">No Show</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
