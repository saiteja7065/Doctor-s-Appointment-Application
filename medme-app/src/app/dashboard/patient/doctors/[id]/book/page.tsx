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

  const handleBookAppointment = async () => {
    if (!form.topic.trim()) {
      toast.error('Please enter a topic for your consultation');
      return;
    }

    if (!patient || patient.creditBalance < (doctor?.consultationFee || 2)) {
      toast.error('Insufficient credits. Please purchase more credits to book this appointment.');
      return;
    }

    setIsBooking(true);

    try {
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          topic: form.topic,
          description: form.description,
          consultationType: form.consultationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      toast.success('Appointment booked successfully!');
      router.push('/dashboard/patient/appointments');

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to book appointment. Please try again.');
    } finally {
      setIsBooking(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/dashboard/patient/doctors/${doctorId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Book Appointment</h1>
            <p className="text-muted-foreground">Complete your appointment booking</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Appointment Details</span>
              </CardTitle>
              <CardDescription>
                Please provide details about your consultation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic">Consultation Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., General checkup, Follow-up, Symptoms discussion"
                  value={form.topic}
                  onChange={(e) => handleInputChange('topic', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Brief description of what you'd like to discuss
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide any additional information about your symptoms, concerns, or questions..."
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This information helps the doctor prepare for your consultation
                </p>
              </div>

              {/* Consultation Type */}
              <div className="space-y-2">
                <Label>Consultation Type</Label>
                <div className="flex space-x-4">
                  <Button
                    variant={form.consultationType === 'video' ? 'default' : 'outline'}
                    onClick={() => handleInputChange('consultationType', 'video')}
                    className="flex-1"
                  >
                    Video Call
                  </Button>
                  <Button
                    variant={form.consultationType === 'phone' ? 'default' : 'outline'}
                    onClick={() => handleInputChange('consultationType', 'phone')}
                    className="flex-1"
                  >
                    Phone Call
                  </Button>
                </div>
              </div>

              {/* Credit Warning */}
              {hasInsufficientCredits && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Insufficient Credits</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    You need {doctor.consultationFee} credits but only have {patient.creditBalance}. 
                    Please purchase more credits to book this appointment.
                  </p>
                  <Link href="/dashboard/patient/subscription" className="inline-block mt-2">
                    <Button size="sm" variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy Credits
                    </Button>
                  </Link>
                </motion.div>
              )}

              {/* Book Button */}
              <Button 
                className="w-full" 
                onClick={handleBookAppointment}
                disabled={isBooking || hasInsufficientCredits || !form.topic.trim()}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking Appointment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Booking ({doctor.consultationFee} credits)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appointment Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="glass-card sticky top-6">
            <CardHeader>
              <CardTitle>Appointment Summary</CardTitle>
              <CardDescription>Review your booking details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Doctor Info */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{doctor.name}</div>
                  <div className="text-sm text-muted-foreground">{doctor.formattedSpecialty}</div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <TimezoneDisplay
                    time={selectedTime}
                    date={selectedDate}
                    showTimezone={true}
                    className="text-sm font-medium"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="text-sm font-medium">30 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium capitalize">{form.consultationType} call</span>
                </div>
              </div>

              <hr className="border-muted" />

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consultation Fee:</span>
                  <span className="text-sm font-medium">{doctor.consultationFee} credits</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Platform Fee:</span>
                  <span className="text-sm font-medium">0 credits</span>
                </div>
                <hr className="border-muted" />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Cost:</span>
                  <span className="font-bold text-primary">{doctor.consultationFee} credits</span>
                </div>
              </div>

              {/* Patient Credit Balance */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Credit Balance:</span>
                  <Badge variant={hasInsufficientCredits ? "destructive" : "secondary"}>
                    {patient.creditBalance} credits
                  </Badge>
                </div>
                {!hasInsufficientCredits && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">After Booking:</span>
                    <span className="text-sm font-medium">
                      {patient.creditBalance - doctor.consultationFee} credits
                    </span>
                  </div>
                )}
              </div>

              {/* Important Notes */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Important Notes:
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Please join the call 5 minutes before your appointment</li>
                  <li>• Ensure you have a stable internet connection</li>
                  <li>• You can reschedule up to 2 hours before the appointment</li>
                  <li>• Cancellations made 24+ hours in advance are fully refundable</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
