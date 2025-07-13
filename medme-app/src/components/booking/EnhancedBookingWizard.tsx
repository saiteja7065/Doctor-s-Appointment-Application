'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  Phone,
  AlertCircle,
  Info,
  Star,
  MapPin,
  Globe
} from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  averageRating: number;
  totalRatings: number;
  consultationFee: number;
  bio: string;
  profileImage?: string;
  timeZone: string;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
}

interface BookingData {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  topic: string;
  description: string;
  consultationType: 'video' | 'phone';
  timezone: string;
}

interface EnhancedBookingWizardProps {
  doctor: Doctor;
  onComplete: (bookingData: BookingData) => void;
  onCancel: () => void;
  userCredits: number;
}

const BOOKING_STEPS = [
  { id: 'datetime', title: 'Date & Time', icon: Calendar },
  { id: 'details', title: 'Consultation Details', icon: FileText },
  { id: 'type', title: 'Consultation Type', icon: Video },
  { id: 'review', title: 'Review & Confirm', icon: CheckCircle }
];

export default function EnhancedBookingWizard({
  doctor,
  onComplete,
  onCancel,
  userCredits
}: EnhancedBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    doctorId: doctor.id,
    consultationType: 'video',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const progress = ((currentStep + 1) / BOOKING_STEPS.length) * 100;
  const hasInsufficientCredits = userCredits < doctor.consultationFee;

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableSlots = async (date: string) => {
    setIsLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/appointments/book?doctorId=${doctor.id}&date=${date}&timezone=${bookingData.timezone}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setAvailableSlots(data.slots || []);
      } else {
        console.error('Failed to load slots:', data.error);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (stepIndex) {
      case 0: // Date & Time
        if (!bookingData.appointmentDate) {
          newErrors.appointmentDate = 'Please select a date';
        }
        if (!bookingData.appointmentTime) {
          newErrors.appointmentTime = 'Please select a time';
        }
        break;
      case 1: // Details
        if (!bookingData.topic?.trim()) {
          newErrors.topic = 'Please enter the consultation topic';
        }
        break;
      case 2: // Type
        if (!bookingData.consultationType) {
          newErrors.consultationType = 'Please select consultation type';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, BOOKING_STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    if (validateStep(currentStep) && bookingData.appointmentDate && bookingData.appointmentTime) {
      onComplete(bookingData as BookingData);
    }
  };

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Date & Time Selection
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="appointmentDate">Select Date</Label>
              <Input
                id="appointmentDate"
                type="date"
                min={getMinDate()}
                max={getMaxDate()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  updateBookingData({ appointmentDate: e.target.value });
                }}
              />
              {errors.appointmentDate && (
                <p className="text-sm text-red-600 mt-1">{errors.appointmentDate}</p>
              )}
            </div>

            {selectedDate && (
              <div>
                <Label>Available Time Slots</Label>
                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {availableSlots.filter(slot => slot.isAvailable).map((slot) => (
                      <Button
                        key={slot.time}
                        variant={bookingData.appointmentTime === slot.time ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateBookingData({ appointmentTime: slot.time })}
                        disabled={slot.isBooked}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
                {errors.appointmentTime && (
                  <p className="text-sm text-red-600 mt-1">{errors.appointmentTime}</p>
                )}
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Timezone Information</h4>
                  <p className="text-sm text-blue-800">
                    Times are shown in your local timezone: {bookingData.timezone}
                  </p>
                  <p className="text-sm text-blue-800">
                    Doctor's timezone: {doctor.timeZone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Consultation Details
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="topic">Consultation Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., General checkup, Follow-up, Specific concern..."
                value={bookingData.topic || ''}
                onChange={(e) => updateBookingData({ topic: e.target.value })}
                maxLength={100}
              />
              {errors.topic && (
                <p className="text-sm text-red-600 mt-1">{errors.topic}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {(bookingData.topic || '').length}/100 characters
              </p>
            </div>

            <div>
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Please provide any additional information about your symptoms, concerns, or questions..."
                value={bookingData.description || ''}
                onChange={(e) => updateBookingData({ description: e.target.value })}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(bookingData.description || '').length}/500 characters
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Important Note</h4>
                  <p className="text-sm text-yellow-800">
                    Please provide accurate information to help the doctor prepare for your consultation.
                    This is not for emergency situations - if you have a medical emergency, please call emergency services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Consultation Type
        return (
          <div className="space-y-6">
            <div>
              <Label>Select Consultation Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Card 
                  className={`cursor-pointer transition-all ${
                    bookingData.consultationType === 'video' 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => updateBookingData({ consultationType: 'video' })}
                >
                  <CardContent className="p-6 text-center">
                    <Video className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">Video Call</h3>
                    <p className="text-sm text-muted-foreground">
                      Face-to-face consultation with video and audio
                    </p>
                    <Badge className="mt-2">Recommended</Badge>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    bookingData.consultationType === 'phone' 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => updateBookingData({ consultationType: 'phone' })}
                >
                  <CardContent className="p-6 text-center">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">Phone Call</h3>
                    <p className="text-sm text-muted-foreground">
                      Audio-only consultation via phone
                    </p>
                  </CardContent>
                </Card>
              </div>
              {errors.consultationType && (
                <p className="text-sm text-red-600 mt-1">{errors.consultationType}</p>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Secure & Private</h4>
                  <p className="text-sm text-green-800">
                    All consultations are conducted through our secure, HIPAA-compliant platform.
                    Your privacy and medical information are fully protected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Review & Confirm
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Review Your Appointment</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Doctor</span>
                  <span>Dr. {doctor.firstName} {doctor.lastName}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Date</span>
                  <span>{new Date(bookingData.appointmentDate!).toLocaleDateString()}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Time</span>
                  <span>{bookingData.appointmentTime} ({bookingData.timezone})</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Type</span>
                  <span className="capitalize">{bookingData.consultationType}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Topic</span>
                  <span>{bookingData.topic}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Cost</span>
                  <span>{doctor.consultationFee} credits</span>
                </div>
              </div>
            </div>

            {hasInsufficientCredits && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Insufficient Credits</h4>
                    <p className="text-sm text-red-800">
                      You need {doctor.consultationFee} credits but only have {userCredits}.
                      Please purchase more credits to book this appointment.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Book Appointment</h2>
          <Badge variant="outline">{currentStep + 1} of {BOOKING_STEPS.length}</Badge>
        </div>
        
        <Progress value={progress} className="h-2 mb-4" />
        
        <div className="flex justify-between">
          {BOOKING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  isActive ? 'font-medium' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BOOKING_STEPS[currentStep].icon className="h-5 w-5" />
            <span>{BOOKING_STEPS[currentStep].title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>
        
        <Button
          onClick={currentStep === BOOKING_STEPS.length - 1 ? handleComplete : nextStep}
          disabled={hasInsufficientCredits && currentStep === BOOKING_STEPS.length - 1}
        >
          {currentStep === BOOKING_STEPS.length - 1 ? 'Book Appointment' : 'Next'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
