'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Stethoscope, 
  Upload, 
  FileText, 
  GraduationCap, 
  Award,
  Plus,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { MedicalSpecialty } from '@/lib/types/user';

// Medical specialties array for the select component
const MEDICAL_SPECIALTIES = Object.values(MedicalSpecialty);

interface Education {
  degree: string;
  institution: string;
  graduationYear: number;
}

interface Certification {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
}

export default function DoctorOnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    specialty: '',
    licenseNumber: '',
    credentialUrl: '',
    yearsOfExperience: '',
    bio: '',
    languages: ['English'],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    consultationFee: '2',
  });

  const [education, setEducation] = useState<Education[]>([
    { degree: '', institution: '', graduationYear: new Date().getFullYear() }
  ]);

  const [certifications, setCertifications] = useState<Certification[]>([
    { name: '', issuingOrganization: '', issueDate: '', expiryDate: '' }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState<{
    license?: {
      file: File;
      url: string;
      uploaded: boolean;
    };
    degree?: {
      file: File;
      url: string;
      uploaded: boolean;
    };
    certifications?: {
      file: File;
      url: string;
      uploaded: boolean;
    };
  }>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEducation = () => {
    setEducation(prev => [...prev, { degree: '', institution: '', graduationYear: new Date().getFullYear() }]);
  };

  const removeEducation = (index: number) => {
    setEducation(prev => prev.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof Education, value: string | number) => {
    setEducation(prev => prev.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
    ));
  };

  const addCertification = () => {
    setCertifications(prev => [...prev, { name: '', issuingOrganization: '', issueDate: '', expiryDate: '' }]);
  };

  const removeCertification = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setCertifications(prev => prev.map((cert, i) => 
      i === index ? { ...cert, [field]: value } : cert
    ));
  };

  const addLanguage = (language: string) => {
    if (language && !formData.languages.includes(language)) {
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

  const handleFileUpload = async (type: string, file: File) => {
    try {
      setIsLoading(true);

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Upload file to server
      const response = await fetch('/api/upload/credentials', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to upload file');
        return;
      }

      // Store uploaded file info
      setUploadedFiles(prev => ({
        ...prev,
        [type]: {
          file,
          url: result.url,
          uploaded: true,
        }
      }));

      // Update credential URL in form data if it's a license
      if (type === 'license') {
        setFormData(prev => ({
          ...prev,
          credentialUrl: result.url
        }));
      }

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.specialty && formData.licenseNumber && formData.yearsOfExperience);
      case 2:
        return education.every(edu => edu.degree && edu.institution && edu.graduationYear);
      case 3:
        return !!(formData.credentialUrl && formData.bio);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare document URLs from uploaded files
      const documentUrls = {
        medicalLicense: uploadedFiles.license?.url,
        degreeCertificate: uploadedFiles.degree?.url,
        certifications: uploadedFiles.certifications?.url ? [uploadedFiles.certifications.url] : [],
      };

      const applicationData = {
        clerkId: user?.id,
        email: user?.emailAddresses[0]?.emailAddress,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        ...formData,
        documentUrls,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        consultationFee: parseInt(formData.consultationFee),
        education: education.filter(edu => edu.degree && edu.institution),
        certifications: certifications.filter(cert => cert.name && cert.issuingOrganization),
      };

      const response = await fetch('/api/doctors/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (response.ok) {
        setCurrentStep(4);
        toast.success('Application submitted successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatSpecialty = (specialty: string) => {
    return specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen medical-gradient">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">MedMe</span>
            <span className="text-lg text-muted-foreground">Doctor Application</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-4 ${
                        currentStep > step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Basic Info</span>
              <span>Education</span>
              <span>Credentials</span>
              <span>Review</span>
            </div>
          </div>

          {/* Step Content */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {currentStep === 1 && <FileText className="w-5 h-5" />}
                {currentStep === 2 && <GraduationCap className="w-5 h-5" />}
                {currentStep === 3 && <Award className="w-5 h-5" />}
                {currentStep === 4 && <CheckCircle className="w-5 h-5" />}
                <span>
                  {currentStep === 1 && 'Basic Information'}
                  {currentStep === 2 && 'Education & Experience'}
                  {currentStep === 3 && 'Credentials & Verification'}
                  {currentStep === 4 && 'Application Submitted'}
                </span>
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Tell us about your medical practice and specialization'}
                {currentStep === 2 && 'Add your educational background and certifications'}
                {currentStep === 3 && 'Provide verification details and professional information'}
                {currentStep === 4 && 'Your application has been submitted for review'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Medical Specialty *</Label>
                      <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDICAL_SPECIALTIES.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>
                              {formatSpecialty(specialty)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">Medical License Number *</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                        placeholder="Enter your license number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                      <Input
                        id="yearsOfExperience"
                        type="number"
                        min="0"
                        value={formData.yearsOfExperience}
                        onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                        placeholder="Years of practice"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultationFee">Consultation Fee (Credits)</Label>
                      <Input
                        id="consultationFee"
                        type="number"
                        min="1"
                        value={formData.consultationFee}
                        onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                        placeholder="2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeZone">Time Zone</Label>
                    <Input
                      id="timeZone"
                      value={formData.timeZone}
                      onChange={(e) => handleInputChange('timeZone', e.target.value)}
                      placeholder="Your time zone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Languages Spoken</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.languages.map((language) => (
                        <Badge key={language} variant="secondary" className="flex items-center space-x-1">
                          <span>{language}</span>
                          {language !== 'English' && (
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() => removeLanguage(language)}
                            />
                          )}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a language"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addLanguage(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Education & Experience */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-medium">Education</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Education
                      </Button>
                    </div>

                    {education.map((edu, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Degree *</Label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                              placeholder="e.g., MD, MBBS"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Institution *</Label>
                            <Input
                              value={edu.institution}
                              onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                              placeholder="University/Medical School"
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex-1">
                              <Label>Graduation Year *</Label>
                              <Input
                                type="number"
                                min="1950"
                                max={new Date().getFullYear()}
                                value={edu.graduationYear}
                                onChange={(e) => updateEducation(index, 'graduationYear', parseInt(e.target.value))}
                              />
                            </div>
                            {education.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => removeEducation(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-medium">Certifications</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>

                    {certifications.map((cert, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Certification Name</Label>
                            <Input
                              value={cert.name}
                              onChange={(e) => updateCertification(index, 'name', e.target.value)}
                              placeholder="e.g., Board Certification"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Issuing Organization</Label>
                            <Input
                              value={cert.issuingOrganization}
                              onChange={(e) => updateCertification(index, 'issuingOrganization', e.target.value)}
                              placeholder="e.g., American Board of Internal Medicine"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Issue Date</Label>
                            <Input
                              type="date"
                              value={cert.issueDate}
                              onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex-1">
                              <Label>Expiry Date (Optional)</Label>
                              <Input
                                type="date"
                                value={cert.expiryDate}
                                onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                              />
                            </div>
                            {certifications.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => removeCertification(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Credentials & Verification */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="credentialUrl">Credential Verification URL *</Label>
                      <Input
                        id="credentialUrl"
                        value={formData.credentialUrl}
                        onChange={(e) => handleInputChange('credentialUrl', e.target.value)}
                        placeholder="https://example.com/verify-credentials"
                        type="url"
                      />
                      <p className="text-sm text-muted-foreground">
                        Provide a URL where administrators can verify your medical credentials
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio *</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Tell patients about your experience, approach to medicine, and what makes you unique..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.bio.length}/1000 characters
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-medium">Document Upload (Optional)</Label>
                      <p className="text-sm text-muted-foreground">
                        Upload supporting documents to expedite the verification process
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4 border-dashed">
                          <div className="text-center space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                            <Label className="text-sm font-medium">Medical License</Label>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload('license', file);
                              }}
                              className="text-xs"
                            />
                            {uploadedFiles.license && (
                              <p className="text-xs text-green-600">
                                ✓ {uploadedFiles.license.file.name}
                                {uploadedFiles.license.uploaded && ' (Uploaded)'}
                              </p>
                            )}
                          </div>
                        </Card>

                        <Card className="p-4 border-dashed">
                          <div className="text-center space-y-2">
                            <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground" />
                            <Label className="text-sm font-medium">Degree Certificate</Label>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload('degree', file);
                              }}
                              className="text-xs"
                            />
                            {uploadedFiles.degree && (
                              <p className="text-xs text-green-600">
                                ✓ {uploadedFiles.degree.file.name}
                                {uploadedFiles.degree.uploaded && ' (Uploaded)'}
                              </p>
                            )}
                          </div>
                        </Card>

                        <Card className="p-4 border-dashed">
                          <div className="text-center space-y-2">
                            <Award className="w-8 h-8 mx-auto text-muted-foreground" />
                            <Label className="text-sm font-medium">Certifications</Label>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) handleFileUpload('certifications', files[0]);
                              }}
                              className="text-xs"
                            />
                            {uploadedFiles.certifications && (
                              <p className="text-xs text-green-600">
                                ✓ {uploadedFiles.certifications.file.name}
                                {uploadedFiles.certifications.uploaded && ' (Uploaded)'}
                              </p>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Application Submitted */}
              {currentStep === 4 && (
                <div className="text-center space-y-6 py-8 animate-fade-in-scale">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Application Submitted!</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Thank you for applying to join MedMe as a healthcare provider. Your application is now under review.
                    </p>
                  </div>

                  <Card className="max-w-md mx-auto text-left">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span>What happens next?</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Document Review</p>
                          <p className="text-sm text-muted-foreground">
                            Our team will verify your credentials and documents
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Credential Verification</p>
                          <p className="text-sm text-muted-foreground">
                            We'll verify your medical license and certifications
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Approval & Activation</p>
                          <p className="text-sm text-muted-foreground">
                            Once approved, you'll receive access to your doctor dashboard
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Review Time:</strong> 2-5 business days
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email notification once your application is reviewed.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    onClick={currentStep === 3 ? handleSubmit : nextStep}
                    disabled={isLoading}
                  >
                    {currentStep === 3 ? 'Submit Application' : 'Next'}
                  </Button>
                ) : (
                  <Button onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
