'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Mic, 
  MicOff, 
  CameraOff, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Video
} from 'lucide-react';

interface PreCallScreenProps {
  onJoinCall: () => void;
  appointment?: {
    id: string;
    patientName?: string;
    doctorName?: string;
    scheduledTime: string;
    duration: number;
    type: 'video' | 'audio';
  };
  userRole: 'doctor' | 'patient';
}

export default function PreCallScreen({ onJoinCall, appointment, userRole }: PreCallScreenProps) {
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemChecks, setSystemChecks] = useState({
    camera: false,
    microphone: false,
    internet: false,
    browser: false
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate system checks
    const runSystemChecks = async () => {
      // Check camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setSystemChecks(prev => ({ ...prev, camera: true }));
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera check failed:', error);
      }

      // Check microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setSystemChecks(prev => ({ ...prev, microphone: true }));
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Microphone check failed:', error);
      }

      // Check internet (simplified)
      setSystemChecks(prev => ({ ...prev, internet: navigator.onLine }));

      // Check browser compatibility
      const isCompatible = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setSystemChecks(prev => ({ ...prev, browser: isCompatible }));
    };

    runSystemChecks();
  }, []);

  useEffect(() => {
    const allChecksPass = Object.values(systemChecks).every(check => check);
    setIsReady(allChecksPass);
  }, [systemChecks]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getOtherPartyName = () => {
    if (userRole === 'doctor') {
      return appointment?.patientName || 'Patient';
    }
    return appointment?.doctorName || 'Doctor';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Video Consultation
          </h1>
          <p className="text-gray-600">
            Prepare for your consultation with {getOtherPartyName()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Camera Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {cameraEnabled ? (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera Preview</p>
                      <p className="text-sm opacity-75">Your video will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <CameraOff className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera Disabled</p>
                    </div>
                  </div>
                )}
                
                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <Button
                    variant={cameraEnabled ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                  >
                    {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant={micEnabled ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setMicEnabled(!micEnabled)}
                  >
                    {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details & System Check */}
          <div className="space-y-6">
            {/* Appointment Info */}
            {appointment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{getOtherPartyName()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{formatTime(appointment.scheduledTime)}</span>
                    <Badge variant="outline">{appointment.duration} min</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Video className="h-4 w-4 text-gray-500" />
                    <span className="capitalize">{appointment.type} consultation</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Check */}
            <Card>
              <CardHeader>
                <CardTitle>System Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries({
                  camera: 'Camera',
                  microphone: 'Microphone',
                  internet: 'Internet Connection',
                  browser: 'Browser Compatibility'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    {systemChecks[key as keyof typeof systemChecks] ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex items-center justify-between font-medium">
                  <span>Ready to join</span>
                  {isReady ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Join Button */}
            <Button 
              onClick={onJoinCall}
              disabled={!isReady}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isReady ? 'Join Consultation' : 'System Check in Progress...'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
