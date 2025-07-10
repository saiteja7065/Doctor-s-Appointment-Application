'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Star, 
  MapPin, 
  Clock,
  Filter,
  Stethoscope,
  Calendar,
  Video,
  User
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  location: string;
  availability: string;
  image: string;
  experience: number;
  languages: string[];
  consultationFee: number;
  nextAvailable: string;
}

export default function FindDoctorsPage() {
  const { user, isLoaded } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  const specialties = [
    'all',
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Psychiatry',
    'Orthopedics'
  ];

  useEffect(() => {
    const loadDoctors = async () => {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockDoctors: Doctor[] = [
        {
          id: '1',
          name: 'Dr. Sarah Johnson',
          specialty: 'General Practice',
          rating: 4.8,
          reviewCount: 127,
          location: 'Downtown Medical Center',
          availability: 'Available Today',
          image: '/api/placeholder/100/100',
          experience: 8,
          languages: ['English', 'Spanish'],
          consultationFee: 2,
          nextAvailable: '2:00 PM Today'
        },
        {
          id: '2',
          name: 'Dr. Michael Chen',
          specialty: 'Cardiology',
          rating: 4.9,
          reviewCount: 89,
          location: 'Heart Care Clinic',
          availability: 'Available Tomorrow',
          image: '/api/placeholder/100/100',
          experience: 12,
          languages: ['English', 'Mandarin'],
          consultationFee: 2,
          nextAvailable: '10:00 AM Tomorrow'
        },
        {
          id: '3',
          name: 'Dr. Emily Rodriguez',
          specialty: 'Dermatology',
          rating: 4.7,
          reviewCount: 156,
          location: 'Skin Health Center',
          availability: 'Available This Week',
          image: '/api/placeholder/100/100',
          experience: 6,
          languages: ['English', 'Spanish'],
          consultationFee: 2,
          nextAvailable: 'Wed 3:00 PM'
        }
      ];
      
      setDoctors(mockDoctors);
      setIsLoading(false);
    };

    if (isLoaded && user) {
      loadDoctors();
    }
  }, [isLoaded, user]);

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Find Doctors</h1>
          <p className="text-muted-foreground mt-2">
            Browse and book appointments with qualified healthcare professionals
          </p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <Button
                  key={specialty}
                  variant={selectedSpecialty === specialty ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSpecialty(specialty)}
                  className="capitalize"
                >
                  {specialty}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Doctors Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No doctors found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all specialties.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {doctor.name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {doctor.specialty}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{doctor.rating}</span>
                        <span className="text-muted-foreground text-sm">
                          ({doctor.reviewCount} reviews)
                        </span>
                      </div>

                      <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{doctor.location}</span>
                      </div>

                      <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{doctor.nextAvailable}</span>
                      </div>

                      <div className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {doctor.experience} years experience
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="font-medium text-primary">
                          {doctor.consultationFee} credits
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button className="w-full" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Appointment
                      </Button>
                      <Button variant="outline" className="w-full" size="sm">
                        <Video className="h-4 w-4 mr-2" />
                        Video Consultation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
