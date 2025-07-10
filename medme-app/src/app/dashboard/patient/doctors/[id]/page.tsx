'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Star, 
  Clock,
  Calendar,
  Video,
  User,
  Award,
  Languages,
  MapPin,
  Stethoscope,
  GraduationCap,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  formattedSpecialty: string;
  rating: number;
  totalRatings: number;
  experience: number;
  consultationFee: number;
  totalConsultations: number;
  bio?: string;
  languages: string[];
  isOnline: boolean;
  profileImage?: string;
  verificationStatus: string;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
  }>;
}

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
}

interface AvailabilityDay {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

export default function DoctorProfilePage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

  useEffect(() => {
    if (isLoaded && user && doctorId) {
      fetchDoctorProfile();
      fetchDoctorAvailability();
    }
  }, [isLoaded, user, doctorId]);

  const fetchDoctorProfile = async () => {
    try {
      // For now, we'll use demo data since we need to implement the doctor profile API
      const demoDoctor: Doctor = {
        id: doctorId,
        name: 'Dr. Sarah Johnson',
        firstName: 'Sarah',
        lastName: 'Johnson',
        specialty: 'general_practice',
        formattedSpecialty: 'General Practice',
        rating: 4.8,
        totalRatings: 127,
        experience: 8,
        consultationFee: 2,
        totalConsultations: 450,
        bio: 'Dr. Sarah Johnson is a dedicated general practitioner with over 8 years of experience in providing comprehensive healthcare services. She specializes in preventive care, chronic disease management, and family medicine. Dr. Johnson is committed to building long-term relationships with her patients and providing personalized care.',
        languages: ['English', 'Spanish', 'French'],
        isOnline: true,
        profileImage: '/api/placeholder/150/150',
        verificationStatus: 'approved',
        education: [
          {
            degree: 'Doctor of Medicine (MD)',
            institution: 'Harvard Medical School',
            graduationYear: 2015
          },
          {
            degree: 'Bachelor of Science in Biology',
            institution: 'Stanford University',
            graduationYear: 2011
          }
        ],
        certifications: [
          {
            name: 'Board Certified in Family Medicine',
            issuingOrganization: 'American Board of Family Medicine'
          },
          {
            name: 'Advanced Cardiac Life Support (ACLS)',
            issuingOrganization: 'American Heart Association'
          }
        ]
      };
      
      setDoctor(demoDoctor);
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    }
  };

  const fetchDoctorAvailability = async () => {
    try {
      const demoAvailability: AvailabilityDay[] = [];
      const today = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Fetch availability for the next 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = date.toISOString().split('T')[0];

        try {
          // Fetch real availability from API with timezone parameter
          const response = await fetch(`/api/appointments/book?doctorId=${doctorId}&date=${dateString}&timezone=${encodeURIComponent(userTimezone)}`);

          if (response.ok) {
            const data = await response.json();
            const slots: TimeSlot[] = data.slots.map((slot: any) => ({
              id: `${dateString}-${slot.time}`,
              date: dateString,
              time: slot.time,
              isAvailable: slot.isAvailable,
              isBooked: slot.isBooked
            }));

            demoAvailability.push({
              date: dateString,
              dayName,
              slots
            });
          } else {
            // Fallback to demo data if API fails (times in local timezone)
            const slots: TimeSlot[] = [];
            for (let hour = 9; hour < 17; hour++) {
              for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const isAvailable = Math.random() > 0.3;
                const isBooked = isAvailable && Math.random() > 0.8;

                slots.push({
                  id: `${dateString}-${timeString}`,
                  date: dateString,
                  time: timeString,
                  isAvailable: isAvailable && !isBooked,
                  isBooked
                });
              }
            }

            demoAvailability.push({
              date: dateString,
              dayName,
              slots
            });
          }
        } catch (error) {
          console.error(`Error fetching availability for ${dateString}:`, error);
          // Fallback to demo data (times in local timezone)
          const slots: TimeSlot[] = [];
          for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              const isAvailable = Math.random() > 0.3;
              const isBooked = isAvailable && Math.random() > 0.8;

              slots.push({
                id: `${dateString}-${timeString}`,
                date: dateString,
                time: timeString,
                isAvailable: isAvailable && !isBooked,
                isBooked
              });
            }
          }

          demoAvailability.push({
            date: dateString,
            dayName,
            slots
          });
        }
      }

      setAvailability(demoAvailability);
      setSelectedDate(demoAvailability[0]?.date || '');
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable && !slot.isBooked) {
      setSelectedTimeSlot(slot);
    }
  };

  const handleBookAppointment = () => {
    if (selectedTimeSlot && doctor) {
      // Navigate to booking form with selected details
      router.push(`/dashboard/patient/doctors/${doctorId}/book?date=${selectedTimeSlot.date}&time=${selectedTimeSlot.time}`);
    }
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

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Doctor Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The doctor profile you're looking for could not be found.
            </p>
            <Link href="/dashboard/patient/doctors">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctors
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedDayAvailability = availability.find(day => day.date === selectedDate);

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/patient/doctors">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Doctors
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Doctor Profile</h1>
            <p className="text-muted-foreground">View profile and book appointment</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="glass-card sticky top-6">
            <CardContent className="p-6">
              {/* Doctor Avatar and Basic Info */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                    <AvatarFallback className="text-2xl">
                      {doctor.firstName[0]}{doctor.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.isOnline && (
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-1">{doctor.name}</h2>
                <p className="text-muted-foreground mb-2">{doctor.formattedSpecialty}</p>
                
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{doctor.rating}</span>
                    <span className="text-sm text-muted-foreground">
                      ({doctor.totalRatings} reviews)
                    </span>
                  </div>
                </div>
                
                <Badge variant="secondary" className="mb-4">
                  {doctor.consultationFee} credits per consultation
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Award className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-medium">{doctor.experience} Years</div>
                  <div className="text-xs text-muted-foreground">Experience</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-medium">{doctor.totalConsultations}</div>
                  <div className="text-xs text-muted-foreground">Consultations</div>
                </div>
              </div>

              {/* Languages */}
              {doctor.languages.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {doctor.languages.map((language) => (
                      <Badge key={language} variant="outline" className="text-xs">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Status */}
              <div className="flex items-center space-x-2 text-green-600 mb-4">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Verified Doctor</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Tabs defaultValue="availability" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            {/* Availability Tab */}
            <TabsContent value="availability" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Available Time Slots</span>
                  </CardTitle>
                  <CardDescription>
                    Select a date and time for your appointment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <h4 className="font-medium mb-3">Select Date</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {availability.map((day) => (
                        <Button
                          key={day.date}
                          variant={selectedDate === day.date ? "default" : "outline"}
                          className="h-auto p-3 flex flex-col items-center"
                          onClick={() => setSelectedDate(day.date)}
                        >
                          <div className="text-xs text-muted-foreground">
                            {day.dayName.slice(0, 3)}
                          </div>
                          <div className="font-medium">
                            {new Date(day.date).getDate()}
                          </div>
                          <div className="text-xs">
                            {day.slots.filter(slot => slot.isAvailable).length} slots
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDayAvailability && (
                    <div>
                      <h4 className="font-medium mb-3">
                        Available Times for {formatDate(selectedDate)}
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {selectedDayAvailability.slots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant={
                              selectedTimeSlot?.id === slot.id
                                ? "default"
                                : slot.isAvailable
                                  ? "outline"
                                  : "secondary"
                            }
                            className={`h-auto p-2 text-xs ${
                              !slot.isAvailable
                                ? 'opacity-50 cursor-not-allowed'
                                : slot.isBooked
                                  ? 'opacity-75 cursor-not-allowed'
                                  : 'hover:bg-primary/10'
                            }`}
                            onClick={() => handleTimeSlotSelect(slot)}
                            disabled={!slot.isAvailable || slot.isBooked}
                          >
                            {formatTime(slot.time)}
                          </Button>
                        ))}
                      </div>

                      {selectedDayAvailability.slots.filter(slot => slot.isAvailable).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No available slots for this date</p>
                          <p className="text-sm">Please select another date</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Appointment Summary */}
                  {selectedTimeSlot && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-3">Appointment Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Doctor:</span>
                              <span className="font-medium">{doctor.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date:</span>
                              <span className="font-medium">{formatDate(selectedTimeSlot.date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time:</span>
                              <span className="font-medium">{formatTime(selectedTimeSlot.time)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">30 minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cost:</span>
                              <span className="font-medium">{doctor.consultationFee} credits</span>
                            </div>
                          </div>
                          <Button
                            className="w-full mt-4"
                            onClick={handleBookAppointment}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Book This Appointment
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>About Dr. {doctor.lastName}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bio */}
                  {doctor.bio && (
                    <div>
                      <h4 className="font-medium mb-2">Biography</h4>
                      <p className="text-muted-foreground leading-relaxed">{doctor.bio}</p>
                    </div>
                  )}

                  {/* Education */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Education</span>
                    </h4>
                    <div className="space-y-3">
                      {doctor.education.map((edu, index) => (
                        <div key={index} className="border-l-2 border-primary/20 pl-4">
                          <div className="font-medium">{edu.degree}</div>
                          <div className="text-sm text-muted-foreground">{edu.institution}</div>
                          <div className="text-xs text-muted-foreground">Graduated {edu.graduationYear}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Certifications</span>
                    </h4>
                    <div className="space-y-3">
                      {doctor.certifications.map((cert, index) => (
                        <div key={index} className="border-l-2 border-primary/20 pl-4">
                          <div className="font-medium">{cert.name}</div>
                          <div className="text-sm text-muted-foreground">{cert.issuingOrganization}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Specialty */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <Stethoscope className="h-4 w-4" />
                      <span>Specialty</span>
                    </h4>
                    <Badge variant="secondary" className="text-sm">
                      {doctor.formattedSpecialty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Patient Reviews</span>
                  </CardTitle>
                  <CardDescription>
                    {doctor.totalRatings} reviews with an average rating of {doctor.rating} stars
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Reviews feature coming soon</p>
                    <p className="text-sm">Patient reviews will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
