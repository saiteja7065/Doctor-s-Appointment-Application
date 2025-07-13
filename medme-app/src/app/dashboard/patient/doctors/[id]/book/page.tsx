'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  User,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TimezoneDisplay } from '@/components/ui/timezone-display';
import EnhancedBookingWizard from '@/components/booking/EnhancedBookingWizard';
import AppointmentConfirmation from '@/components/booking/AppointmentConfirmation';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  formattedSpecialty: string;
  consultationFee: number;
  profileImage?: string;
}

interface Patient {
  creditBalance: number;
  name: string;
  email: string;
}

interface BookingForm {
  topic: string;
  description: string;
  consultationType: 'video' | 'phone';
}

export default function BookAppointmentPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const doctorId = params.id as string;
  const selectedDate = searchParams.get('date') || '';
  const selectedTime = searchParams.get('time') || '';

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<BookingForm>({
    topic: '',
    description: '',
    consultationType: 'video'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingFlow, setBookingFlow] = useState<'wizard' | 'confirmation'>('wizard');
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && user && doctorId && selectedDate && selectedTime) {
      fetchDoctorProfile();
      fetchPatientProfile();
    }
  }, [isLoaded, user, doctorId, selectedDate, selectedTime]);

  const fetchDoctorProfile = async () => {
    try {
      // Demo doctor data
      const demoDoctor: Doctor = {
        id: doctorId,
        name: 'Dr. Sarah Johnson',
        specialty: 'general_practice',
        formattedSpecialty: 'General Practice',
        consultationFee: 2,
        profileImage: '/api/placeholder/150/150'
      };
      
      setDoctor(demoDoctor);
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast.error('Failed to load doctor information');
    }
  };

  const fetchPatientProfile = async () => {
    try {
      // Demo patient data - in real implementation, fetch from API
      const demoPatient: Patient = {
        creditBalance: 5,
        name: user?.fullName || 'Patient',
        email: user?.emailAddresses[0]?.emailAddress || ''
      };
      
      setPatient(demoPatient);
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      toast.error('Failed to load patient information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof BookingForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleBookAppointment = async (bookingData: any) => {
    setIsBooking(true);

    try {
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setConfirmedAppointment(data.appointment);
      setBookingFlow('confirmation');
      toast.success('Appointment booked successfully!');

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to book appointment. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = () => {
    router.push(`/dashboard/patient/doctors/${doctorId}`);
  };

  const handleViewAppointments = () => {
    router.push('/dashboard/patient/appointments');
  };

  const handleJoinConsultation = () => {
    if (confirmedAppointment?.meetingLink) {
      window.open(confirmedAppointment.meetingLink, '_blank');
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!doctor || !patient || !selectedDate || !selectedTime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Error</h2>
            <p className="text-muted-foreground mb-4">
              Missing required information for booking. Please go back and try again.
            </p>
            <Link href={`/dashboard/patient/doctors/${doctorId}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctor Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasInsufficientCredits = patient.creditBalance < doctor.consultationFee;

  // Render confirmation page if booking is complete
  if (bookingFlow === 'confirmation' && confirmedAppointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <AppointmentConfirmation
          appointment={confirmedAppointment}
          remainingCredits={patient?.creditBalance || 0}
          onViewAppointments={handleViewAppointments}
          onJoinConsultation={handleJoinConsultation}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/patient/doctors/${doctorId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Book Appointment</h1>
            <p className="text-muted-foreground">with {doctor?.name}</p>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Booking Wizard */}
      <EnhancedBookingWizard
        doctor={{
          id: doctor?.id || '',
          firstName: doctor?.name?.split(' ')[1] || 'Doctor',
          lastName: doctor?.name?.split(' ')[2] || '',
          specialty: doctor?.formattedSpecialty || 'General Practice',
          averageRating: 4.8,
          totalRatings: 127,
          consultationFee: doctor?.consultationFee || 2,
          bio: 'Experienced healthcare professional dedicated to providing quality medical care.',
          timeZone: 'UTC'
        }}
        onComplete={handleBookAppointment}
        onCancel={handleCancelBooking}
        userCredits={patient?.creditBalance || 0}
      />
    </div>
  );
}
