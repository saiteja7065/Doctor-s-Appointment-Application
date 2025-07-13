'use client';

import React, { useEffect, useState } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { useRealTimeAppointments, useStatusChangeDetector } from '@/hooks/useRealTimeData';
import { useNotifications } from '@/contexts/NotificationContext';
import { withRealTimeData, WithRealTimeDataProps } from '@/components/hoc/withRealTimeData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Video, 
  User, 
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react';

interface Appointment {
  _id: string;
  doctorName: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  consultationType: 'video' | 'phone';
  consultationFee: number;
  sessionId?: string;
  specialty?: string;
  location?: string;
}

interface RealTimeAppointmentListProps extends WithRealTimeDataProps {
  userType: 'patient' | 'doctor';
  onAppointmentClick?: (appointment: Appointment) => void;
  showActions?: boolean;
  maxItems?: number;
  className?: string;
}

const getStatusConfig = (status: Appointment['status']) => {
  const configs = {
    scheduled: {
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badge: 'default' as const,
      label: 'Scheduled',
    },
    in_progress: {
      icon: PlayCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badge: 'default' as const,
      label: 'In Progress',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      badge: 'secondary' as const,
      label: 'Completed',
    },
    cancelled: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badge: 'destructive' as const,
      label: 'Cancelled',
    },
  };

  return configs[status];
};

function AppointmentListComponent({
  userType,
  realTimeData,
  isLoading,
  error,
  onAppointmentClick,
  showActions = true,
  maxItems,
  className = '',
}: RealTimeAppointmentListProps) {
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());
  const { showConsultationStarted, showConsultationCompleted } = useNotifications();

  const appointments: Appointment[] = realTimeData || [];
  const displayedAppointments = maxItems ? appointments.slice(0, maxItems) : appointments;

  // Detect status changes and trigger notifications
  useStatusChangeDetector(
    appointments,
    (appointment: Appointment) => appointment.status,
    (appointment: Appointment) => appointment._id,
    (appointment, oldStatus, newStatus) => {
      // Highlight the changed appointment
      setHighlightedItems(prev => new Set(prev.add(appointment._id)));
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(appointment._id);
          return newSet;
        });
      }, 3000);

      // Trigger specific notifications based on status change
      if (newStatus === 'in_progress' && appointment.sessionId) {
        showConsultationStarted(
          appointment.sessionId,
          userType === 'doctor' ? appointment.patientName : undefined
        );
      } else if (newStatus === 'completed') {
        showConsultationCompleted(
          userType === 'doctor' ? appointment.consultationFee : undefined
        );
      }
    }
  );

  const handleJoinConsultation = (appointment: Appointment) => {
    if (appointment.sessionId) {
      window.location.href = `/consultation/${appointment.sessionId}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading && !appointments.length) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !appointments.length) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold text-red-800 mb-2">Unable to Load Appointments</h3>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!appointments.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-muted-foreground mb-2">No Appointments</h3>
          <p className="text-sm text-muted-foreground">
            {userType === 'patient' 
              ? "You don't have any appointments scheduled."
              : "You don't have any appointments with patients."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Replaced AnimatePresence with CSS animations */}
      <div className="space-y-4">
        {displayedAppointments.map((appointment, index) => {
          const statusConfig = getStatusConfig(appointment.status);
          const StatusIcon = statusConfig.icon;
          const isHighlighted = highlightedItems.has(appointment._id);

          return (
            <div
              key={appointment._id}
              className={`animate-fade-in-up ${isHighlighted ? 'scale-105 shadow-lg' : 'shadow-sm'} transition-all duration-300`}
              style={{
                animationDelay: `${index * 100}ms`,
                boxShadow: isHighlighted
                  ? '0 4px 20px rgba(59, 130, 246, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              className={`${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusConfig.borderColor} ${statusConfig.bgColor}`}
                onClick={() => onAppointmentClick?.(appointment)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {userType === 'patient' 
                              ? `Dr. ${appointment.doctorName}`
                              : appointment.patientName}
                          </h3>
                          {appointment.specialty && (
                            <p className="text-sm text-muted-foreground">
                              {appointment.specialty}
                            </p>
                          )}
                        </div>
                        <Badge variant={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.appointmentDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.appointmentTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          {appointment.consultationType === 'video' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                          {appointment.consultationType}
                        </div>
                      </div>

                      {/* Location or Fee */}
                      {appointment.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {appointment.location}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {showActions && (
                      <div className="ml-4 flex flex-col gap-2">
                        {appointment.status === 'in_progress' && appointment.sessionId && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinConsultation(appointment);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Video className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        )}
                        {userType === 'doctor' && (
                          <span className="text-sm font-semibold text-green-600">
                            ${appointment.consultationFee}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export the component wrapped with real-time data
export default withRealTimeData(AppointmentListComponent, {
  endpoint: '/api/appointments',
  interval: 15000,
  showConnectionStatus: true,
  showLastUpdated: true,
  showRefreshButton: true,
  autoRefreshOnError: true,
  transform: (data) => data.appointments || [],
});
