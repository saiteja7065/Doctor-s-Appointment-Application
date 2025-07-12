'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Video,
  Clock,
  Users,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import SystemCheck from '@/components/consultation/SystemCheck';

interface ConsultationData {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  duration: number;
  role: 'patient' | 'doctor';
}

export default function PreCallCheckPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemCheckPassed, setSystemCheckPassed] = useState<boolean | null>(null);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    if (user && sessionId) {
      fetchConsultationData();
    }
  }, [user, sessionId]);

  const fetchConsultationData = async () => {
    try {
      const response = await fetch(`/api/consultations/${sessionId}/token`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get consultation data');
      }

      setConsultationData(data);
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load consultation data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSystemCheckComplete = (passed: boolean) => {
    setSystemCheckPassed(passed);
    setCanProceed(true);
    
    if (passed) {
      toast.success('System check completed successfully!');
    } else {
      toast.warning('System check found some issues, but you can still proceed');
    }
  };

  const handleProceedToCall = () => {
    router.push(`/consultation/${sessionId}`);
  };

  const handleRetryCheck = () => {
    setSystemCheckPassed(null);
    setCanProceed(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Loading consultation...</h3>
              <p className="text-muted-foreground">
                Please wait while we prepare your video consultation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button onClick={fetchConsultationData}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Pre-Call System Check</h1>
                <p className="text-sm text-muted-foreground">
                  Ensuring optimal video consultation experience
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {consultationData?.role === 'patient' ? 'Patient' : 'Doctor'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Consultation Info */}
        {consultationData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Upcoming Video Consultation</span>
                </CardTitle>
                <CardDescription>
                  Please complete the system check before joining your consultation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {consultationData.role === 'patient' ? 'Doctor' : 'Patient'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {consultationData.role === 'patient' 
                          ? consultationData.doctorName 
                          : consultationData.patientName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Appointment Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(consultationData.appointmentTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {consultationData.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* System Check Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SystemCheck
            onComplete={handleSystemCheckComplete}
            onRetry={handleRetryCheck}
            showRetryButton={canProceed}
          />
        </motion.div>

        {/* Results and Actions */}
        {canProceed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  {systemCheckPassed ? (
                    <>
                      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                      <div>
                        <h3 className="text-xl font-semibold text-green-700 mb-2">
                          System Check Passed!
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Your system meets all requirements for video consultations. 
                          You're ready to join the call.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500" />
                      <div>
                        <h3 className="text-xl font-semibold text-yellow-700 mb-2">
                          System Check Completed with Warnings
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Some issues were detected, but you can still proceed with the consultation. 
                          The call quality may be affected.
                        </p>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={handleRetryCheck}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Run Check Again
                    </Button>
                    <Button
                      onClick={handleProceedToCall}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Video Call
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>
                If you're experiencing issues with the system check
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Browser Issues:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Update to the latest browser version</li>
                    <li>• Try Chrome, Firefox, Safari, or Edge</li>
                    <li>• Enable JavaScript and cookies</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Camera/Microphone Issues:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Allow camera and microphone permissions</li>
                    <li>• Check device privacy settings</li>
                    <li>• Close other apps using camera/mic</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
