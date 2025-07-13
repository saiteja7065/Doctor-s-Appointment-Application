'use client';

import { useEffect, useState } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { 
  Shield, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  FileText,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Removed framer-motion import to fix compilation error

interface DoctorApplication {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  credentialUrl: string;
  documentUrls?: {
    medicalLicense?: string;
    degreeCertificate?: string;
    certifications?: string[];
    additionalDocuments?: string[];
  };
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
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  submittedAt: string;
  lastUpdated: string;
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'suspended': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'approved': return CheckCircle;
    case 'rejected': return XCircle;
    case 'suspended': return AlertTriangle;
    default: return Clock;
  }
};

export default function AdminDoctorsPage() {
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<DoctorApplication | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/admin/doctors');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      } else {
        // Demo data fallback
        setApplications([
          {
            _id: '1',
            clerkId: 'clerk_123',
            firstName: 'Dr. Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@email.com',
            specialty: 'Cardiology',
            licenseNumber: 'MD123456',
            credentialUrl: 'https://example.com/credentials.pdf',
            yearsOfExperience: 8,
            education: [
              {
                degree: 'MD',
                institution: 'Harvard Medical School',
                graduationYear: 2015
              }
            ],
            certifications: [
              {
                name: 'Board Certified Cardiologist',
                issuingOrganization: 'American Board of Internal Medicine',
                issueDate: '2018-06-15',
                expiryDate: '2028-06-15'
              }
            ],
            bio: 'Experienced cardiologist with expertise in interventional cardiology.',
            languages: ['English', 'Spanish'],
            verificationStatus: 'pending',
            submittedAt: '2025-07-10T10:30:00Z',
            lastUpdated: '2025-07-10T10:30:00Z'
          },
          {
            _id: '2',
            clerkId: 'clerk_456',
            firstName: 'Dr. Michael',
            lastName: 'Chen',
            email: 'michael.chen@email.com',
            specialty: 'Dermatology',
            licenseNumber: 'MD789012',
            credentialUrl: 'https://example.com/credentials2.pdf',
            yearsOfExperience: 12,
            education: [
              {
                degree: 'MD',
                institution: 'Stanford University School of Medicine',
                graduationYear: 2011
              }
            ],
            certifications: [
              {
                name: 'Board Certified Dermatologist',
                issuingOrganization: 'American Board of Dermatology',
                issueDate: '2015-08-20',
                expiryDate: '2025-08-20'
              }
            ],
            bio: 'Dermatologist specializing in skin cancer detection and cosmetic procedures.',
            languages: ['English', 'Mandarin'],
            verificationStatus: 'pending',
            submittedAt: '2025-07-09T14:20:00Z',
            lastUpdated: '2025-07-09T14:20:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      // Demo data fallback
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/doctors/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (response.ok) {
        // Update local state
        setApplications(prev => 
          prev.map(app => 
            app._id === applicationId 
              ? { ...app, verificationStatus: newStatus as any, lastUpdated: new Date().toISOString() }
              : app
          )
        );
        
        // Close modal if open
        setSelectedApplication(null);
      } else {
        console.error('Failed to update application status');
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.verificationStatus === statusFilter;
    const matchesSpecialty = specialtyFilter === 'all' || app.specialty === specialtyFilter;
    
    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  const pendingCount = applications.filter(app => app.verificationStatus === 'pending').length;
  const approvedCount = applications.filter(app => app.verificationStatus === 'approved').length;
  const rejectedCount = applications.filter(app => app.verificationStatus === 'rejected').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Doctor Verification</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage doctor applications
            </p>
          </div>
          <Badge variant="destructive" className="text-sm">
            {pendingCount} Pending
          </Badge>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">
                Active doctors
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">
                Applications denied
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">
                All time submissions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Filter Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or license number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Dermatology">Dermatology</SelectItem>
                  <SelectItem value="General Practice">General Practice</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Doctor Applications</CardTitle>
            <CardDescription>
              {filteredApplications.length} applications found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-6">
                {filteredApplications
                  .filter(app => app.verificationStatus === 'pending')
                  .map((application) => (
                    <ApplicationCard
                      key={application._id}
                      application={application}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedApplication}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4 mt-6">
                {filteredApplications
                  .filter(app => app.verificationStatus === 'approved')
                  .map((application) => (
                    <ApplicationCard
                      key={application._id}
                      application={application}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedApplication}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4 mt-6">
                {filteredApplications
                  .filter(app => app.verificationStatus === 'rejected')
                  .map((application) => (
                    <ApplicationCard
                      key={application._id}
                      application={application}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedApplication}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="all" className="space-y-4 mt-6">
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application._id}
                    application={application}
                    onStatusUpdate={handleStatusUpdate}
                    onViewDetails={setSelectedApplication}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

// Application Card Component
interface ApplicationCardProps {
  application: DoctorApplication;
  onStatusUpdate: (id: string, status: string, reason?: string) => void;
  onViewDetails: (application: DoctorApplication) => void;
}

function ApplicationCard({ application, onStatusUpdate, onViewDetails }: ApplicationCardProps) {
  const StatusIcon = getStatusIcon(application.verificationStatus);

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {application.firstName} {application.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm font-medium">{application.specialty}</span>
              <span className="text-sm text-muted-foreground">
                {application.yearsOfExperience} years experience
              </span>
              <span className="text-sm text-muted-foreground">
                License: {application.licenseNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(application.verificationStatus)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {application.verificationStatus.charAt(0).toUpperCase() + application.verificationStatus.slice(1)}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(application)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Review
          </Button>

          {application.verificationStatus === 'pending' && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => onStatusUpdate(application._id, 'approved')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => onStatusUpdate(application._id, 'rejected', 'Application does not meet verification requirements')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}

          {application.verificationStatus === 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
              onClick={() => onStatusUpdate(application._id, 'suspended', 'Account suspended pending investigation')}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          )}

          {application.verificationStatus === 'suspended' && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => onStatusUpdate(application._id, 'approved', 'Account reactivated after review')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground">
        <p>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</p>
        <p className="mt-1 line-clamp-2">{application.bio}</p>
      </div>
    </div>
  );
}

// Application Detail Modal Component
interface ApplicationDetailModalProps {
  application: DoctorApplication;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, reason?: string) => void;
}

function ApplicationDetailModal({ application, onClose, onStatusUpdate }: ApplicationDetailModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {application.firstName} {application.lastName} - Application Review
            </h2>
            <Button variant="outline" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p>{application.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                <p>{application.specialty}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">License Number</label>
                <p>{application.licenseNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                <p>{application.yearsOfExperience} years</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Languages</label>
                <p>{application.languages.join(', ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge className={getStatusColor(application.verificationStatus)}>
                  {application.verificationStatus.charAt(0).toUpperCase() + application.verificationStatus.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Professional Bio</h3>
            <p className="text-sm">{application.bio}</p>
          </div>

          {/* Education */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Education</h3>
            <div className="space-y-2">
              {application.education.map((edu, index) => (
                <div key={index} className="border rounded p-3">
                  <p className="font-medium">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-sm text-muted-foreground">Graduated: {edu.graduationYear}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Certifications</h3>
            <div className="space-y-2">
              {application.certifications.map((cert, index) => (
                <div key={index} className="border rounded p-3">
                  <p className="font-medium">{cert.name}</p>
                  <p className="text-sm text-muted-foreground">{cert.issuingOrganization}</p>
                  <p className="text-sm text-muted-foreground">
                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    {cert.expiryDate && ` | Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Credentials & Documents</h3>
            <div className="space-y-3">
              {/* Primary Credential URL */}
              <Button
                variant="outline"
                onClick={() => window.open(application.credentialUrl, '_blank')}
                className="flex items-center space-x-2 w-full justify-start"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Primary Credential Document</span>
              </Button>

              {/* Uploaded Documents */}
              {application.documentUrls && (
                <div className="space-y-2">
                  {application.documentUrls.medicalLicense && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(application.documentUrls!.medicalLicense!, '_blank')}
                      className="flex items-center space-x-2 w-full justify-start"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Medical License</span>
                    </Button>
                  )}

                  {application.documentUrls.degreeCertificate && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(application.documentUrls!.degreeCertificate!, '_blank')}
                      className="flex items-center space-x-2 w-full justify-start"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Degree Certificate</span>
                    </Button>
                  )}

                  {application.documentUrls.certifications && application.documentUrls.certifications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Certification Documents:</p>
                      {application.documentUrls.certifications.map((certUrl, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => window.open(certUrl, '_blank')}
                          className="flex items-center space-x-2 w-full justify-start mb-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Certification {index + 1}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {application.documentUrls.additionalDocuments && application.documentUrls.additionalDocuments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Additional Documents:</p>
                      {application.documentUrls.additionalDocuments.map((docUrl, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => window.open(docUrl, '_blank')}
                          className="flex items-center space-x-2 w-full justify-start mb-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Document {index + 1}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!application.documentUrls && (
                <p className="text-sm text-muted-foreground">
                  No additional documents uploaded during application.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {application.verificationStatus === 'pending' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Review Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
                  <Input
                    placeholder="Enter reason for approval/rejection..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onStatusUpdate(application._id, 'approved', reason);
                      onClose();
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Application
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onStatusUpdate(application._id, 'rejected', reason);
                      onClose();
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
