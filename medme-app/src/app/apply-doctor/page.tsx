'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Stethoscope, 
  Upload, 
  FileText, 
  GraduationCap, 
  Award, 
  Globe, 
  DollarSign,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { MedicalSpecialty } from '@/lib/models/Doctor';

// Form data interface
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  specialty: MedicalSpecialty | '';
  licenseNumber: string;
  credentialUrl: string;
  yearsOfExperience: number;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate?: string;
  }>;
  bio: string;
  languages: string[];
  consultationFee: number;
  additionalNotes: string;
}

// Medical specialties for dropdown
const MEDICAL_SPECIALTIES = Object.values(MedicalSpecialty).map(specialty => ({
  value: specialty,
  label: specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

// Common languages
const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian'
];

export default function ApplyDoctorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    specialty: '',
    licenseNumber: '',
    credentialUrl: '',
    yearsOfExperience: 0,
    education: [{ degree: '', institution: '', graduationYear: new Date().getFullYear() }],
    certifications: [],
    bio: '',
    languages: ['English'],
    consultationFee: 2,
    additionalNotes: '',
  });

  // Check for existing application on load
  useEffect(() => {
    if (isLoaded && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.emailAddresses[0]?.emailAddress || '',
      }));

      checkExistingApplication();
    }
  }, [isLoaded, user]);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/doctors/apply');
      if (response.ok) {
        const data = await response.json();
        if (data.hasApplication) {
          setHasExistingApplication(true);
          setApplicationStatus(data.application.status);
        }
      }
    } catch (error) {
      console.error('Error checking existing application:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', graduationYear: new Date().getFullYear() }]
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { 
        name: '', 
        issuingOrganization: '', 
        issueDate: '',
        expiryDate: ''
      }]
    }));
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const updateCertification = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const addLanguage = (language: string) => {
    if (!formData.languages.includes(language)) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, language]
      }));
    }
  };

  const removeLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== language)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error('Phone number is required');
      return false;
    }
    if (!formData.specialty) {
      toast.error('Medical specialty is required');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      toast.error('License number is required');
      return false;
    }
    if (!formData.credentialUrl.trim()) {
      toast.error('Credential URL is required');
      return false;
    }
    if (formData.yearsOfExperience < 0) {
      toast.error('Years of experience cannot be negative');
      return false;
    }
    if (formData.education.length === 0 || !formData.education[0].degree.trim()) {
      toast.error('At least one education entry is required');
      return false;
    }
    if (formData.languages.length === 0) {
      toast.error('At least one language is required');
      return false;
    }
    if (formData.consultationFee < 1 || formData.consultationFee > 20) {
      toast.error('Consultation fee must be between 1 and 20 credits');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/doctors/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Doctor application submitted successfully!');
        router.push('/dashboard?tab=application-status');
      } else {
        if (data.details) {
          // Handle validation errors
          data.details.forEach((error: any) => {
            toast.error(`${error.field}: ${error.message}`);
          });
        } else {
          toast.error(data.message || 'Failed to submit application');
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
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

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  if (hasExistingApplication) {
    return (
      <div className="min-h-screen medical-gradient p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="glass-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Application Already Submitted</CardTitle>
              <CardDescription>
                You have already submitted a doctor application
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Current Status:</p>
                <Badge variant={applicationStatus === 'approved' ? 'default' : 'secondary'}>
                  {applicationStatus?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Please check your dashboard for application status updates and next steps.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-gradient p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Apply to Become a Doctor</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join our platform as a verified medical professional. Complete the application below 
            and our team will review your credentials within 2-5 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Basic information about yourself
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>
                Your medical credentials and professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialty">Medical Specialty *</Label>
                  <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICAL_SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty.value} value={specialty.value}>
                          {specialty.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    placeholder="Enter years of experience"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licenseNumber">Medical License Number *</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    placeholder="Enter your license number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consultationFee">Consultation Fee (Credits) *</Label>
                  <Input
                    id="consultationFee"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.consultationFee}
                    onChange={(e) => handleInputChange('consultationFee', parseInt(e.target.value) || 2)}
                    placeholder="Enter consultation fee"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="credentialUrl">Credential Verification URL *</Label>
                <Input
                  id="credentialUrl"
                  type="url"
                  value={formData.credentialUrl}
                  onChange={(e) => handleInputChange('credentialUrl', e.target.value)}
                  placeholder="https://example.com/verify-credentials"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL where your medical credentials can be verified online
                </p>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell patients about your background, experience, and approach to medicine..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.bio.length}/1000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <CardDescription>
                Your educational background and qualifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.education.map((edu, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Education {index + 1}</h4>
                    {formData.education.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Degree *</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="e.g., Doctor of Medicine (MD)"
                        required
                      />
                    </div>
                    <div>
                      <Label>Institution *</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                        placeholder="e.g., Harvard Medical School"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Graduation Year *</Label>
                    <Input
                      type="number"
                      min="1950"
                      max={new Date().getFullYear()}
                      value={edu.graduationYear}
                      onChange={(e) => updateEducation(index, 'graduationYear', parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addEducation}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Education
              </Button>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Languages
              </CardTitle>
              <CardDescription>
                Languages you can communicate in with patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((language) => (
                  <Badge key={language} variant="secondary" className="flex items-center gap-1">
                    {language}
                    <button
                      type="button"
                      onClick={() => removeLanguage(language)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div>
                <Label>Add Language</Label>
                <Select onValueChange={addLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a language to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LANGUAGES.filter(lang => !formData.languages.includes(lang)).map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Any additional information you'd like to share
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  placeholder="Any additional information about your practice, specializations, or other relevant details..."
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.additionalNotes.length}/2000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full md:w-auto px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
