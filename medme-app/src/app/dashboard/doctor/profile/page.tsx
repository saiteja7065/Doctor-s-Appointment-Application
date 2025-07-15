'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star,
  Award,
  GraduationCap,
  Briefcase,
  Clock,
  DollarSign,
  Camera,
  Save,
  Edit
} from 'lucide-react';

interface DoctorProfile {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    profileImage: string;
  };
  professionalInfo: {
    medicalLicense: string;
    specialization: string[];
    experience: number;
    education: string;
    hospital: string;
    consultationFee: number;
    languages: string[];
    bio: string;
  };
  availability: {
    workingDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    timeZone: string;
  };
  stats: {
    totalPatients: number;
    totalConsultations: number;
    averageRating: number;
    totalEarnings: number;
  };
}

export default function DoctorProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Demo profile data
  const demoProfile: DoctorProfile = {
    personalInfo: {
      firstName: 'Dr. John',
      lastName: 'Smith',
      email: 'dr.john.smith@medme.com',
      phone: '+1 (555) 123-4567',
      dateOfBirth: '1980-05-15',
      gender: 'Male',
      address: '123 Medical Center Dr',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      profileImage: '/api/placeholder/150/150'
    },
    professionalInfo: {
      medicalLicense: 'MD123456789',
      specialization: ['Cardiology', 'Internal Medicine'],
      experience: 15,
      education: 'MD from Harvard Medical School',
      hospital: 'New York Presbyterian Hospital',
      consultationFee: 150,
      languages: ['English', 'Spanish', 'French'],
      bio: 'Experienced cardiologist with over 15 years of practice. Specialized in preventive cardiology and heart disease management. Committed to providing personalized care to each patient.'
    },
    availability: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      timeZone: 'America/New_York'
    },
    stats: {
      totalPatients: 1250,
      totalConsultations: 3400,
      averageRating: 4.8,
      totalEarnings: 125000
    }
  };

  useEffect(() => {
    // Simulate API call
    const fetchProfile = async () => {
      setLoading(true);
      // In a real app, this would be an API call
      setTimeout(() => {
        setProfile(demoProfile);
        setLoading(false);
      }, 1000);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      // Show success message
    }, 1500);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded-lg"></div>
              <div className="h-96 bg-muted rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your professional profile and settings
            </p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                    {editing && (
                      <Button size="sm" variant="outline" className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0">
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.personalInfo.firstName}
                        disabled={!editing}
                        className={!editing ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.personalInfo.lastName}
                        disabled={!editing}
                        className={!editing ? 'bg-muted' : ''}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.personalInfo.email}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.personalInfo.phone}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profile.personalInfo.dateOfBirth}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={profile.personalInfo.gender} disabled={!editing}>
                      <SelectTrigger className={!editing ? 'bg-muted' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={profile.personalInfo.address}
                    disabled={!editing}
                    className={!editing ? 'bg-muted' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.personalInfo.city}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profile.personalInfo.state}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={profile.personalInfo.zipCode}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Professional Information */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medicalLicense">Medical License</Label>
                    <Input
                      id="medicalLicense"
                      value={profile.professionalInfo.medicalLicense}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={profile.professionalInfo.experience}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialization">Specializations</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.professionalInfo.specialization.map((spec, index) => (
                      <Badge key={index} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={profile.professionalInfo.education}
                    disabled={!editing}
                    className={!editing ? 'bg-muted' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hospital">Hospital/Clinic</Label>
                    <Input
                      id="hospital"
                      value={profile.professionalInfo.hospital}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      value={profile.professionalInfo.consultationFee}
                      disabled={!editing}
                      className={!editing ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="languages">Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.professionalInfo.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.professionalInfo.bio}
                    disabled={!editing}
                    className={!editing ? 'bg-muted' : ''}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Professional Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Patients</span>
                  <span className="font-semibold">{profile.stats.totalPatients.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consultations</span>
                  <span className="font-semibold">{profile.stats.totalConsultations.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Average Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{profile.stats.averageRating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Earnings</span>
                  <span className="font-semibold">${profile.stats.totalEarnings.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Availability */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Working Days</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.availability.workingDays.map((day, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Working Hours</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.availability.workingHours.start} - {profile.availability.workingHours.end}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time Zone</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.availability.timeZone}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
