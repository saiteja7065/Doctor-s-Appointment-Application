'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  MapPin, 
  Clock,
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

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment?: (doctorId: string) => void;
}

// Memoized doctor card component to prevent unnecessary re-renders
const OptimizedDoctorCard = memo(({ doctor, onBookAppointment }: DoctorCardProps) => {
  const handleBookAppointment = useCallback(() => {
    onBookAppointment?.(doctor.id);
  }, [doctor.id, onBookAppointment]);

  const renderStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  }, []);

  return (
    <Card className="glass-card h-full hover:shadow-lg transition-all duration-300 animate-fade-in">
      <CardHeader className="text-center pb-4">
        <div className="relative mx-auto mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            {doctor.image ? (
              <img
                src={doctor.image}
                alt={doctor.name}
                className="w-16 h-16 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-10 h-10 text-primary" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
        
        <CardTitle className="text-lg font-semibold text-foreground">
          {doctor.name}
        </CardTitle>
        
        <CardDescription className="flex items-center justify-center space-x-1 text-sm">
          <Stethoscope className="w-4 h-4" />
          <span>{doctor.specialty}</span>
        </CardDescription>
        
        <div className="flex items-center justify-center space-x-1 mt-2">
          {renderStars(doctor.rating)}
          <span className="text-sm text-muted-foreground ml-2">
            {doctor.rating} ({doctor.reviewCount} reviews)
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{doctor.location}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{doctor.experience} years experience</span>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Next: {doctor.nextAvailable}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {doctor.languages.slice(0, 2).map((language) => (
            <Badge key={language} variant="secondary" className="text-xs">
              {language}
            </Badge>
          ))}
          {doctor.languages.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{doctor.languages.length - 2}
            </Badge>
          )}
        </div>
        
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Consultation Fee</span>
            <span className="text-lg font-bold text-primary">
              {doctor.consultationFee} credits
            </span>
          </div>
          
          <div className="space-y-2">
            <Link href={`/dashboard/patient/doctors/${doctor.id}`}>
              <Button variant="outline" className="w-full" size="sm">
                View Profile
              </Button>
            </Link>
            
            <Link href={`/dashboard/patient/doctors/${doctor.id}/book`}>
              <Button className="w-full" size="sm" onClick={handleBookAppointment}>
                <Video className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedDoctorCard.displayName = 'OptimizedDoctorCard';

export default OptimizedDoctorCard;
