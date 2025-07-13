'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Camera,
  Speaker,
  Monitor,
  Wifi,
  RefreshCw,
  Phone
} from 'lucide-react';

interface WaitingRoomProps {
  sessionId: string;
  userRole: 'patient' | 'doctor';
  appointmentTime: string;
  doctorName?: string;
  patientName?: string;
  onJoinCall: () => void;
  onLeaveWaiting: () => void;
}

interface ParticipantStatus {
  id: string;
  name: string;
  role: 'patient' | 'doctor';
  isOnline: boolean;
  joinedAt?: Date;
}

export default function WaitingRoom({
  sessionId,
  userRole,
  appointmentTime,
  doctorName,
  patientName,
  onJoinCall,
  onLeaveWaiting
}: WaitingRoomProps) {
  const [timeUntilAppointment, setTimeUntilAppointment] = useState<number>(0);
  const [isEarly, setIsEarly] = useState(false);
  const [participants, setParticipants] = useState<ParticipantStatus[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [isTestingAV, setIsTestingAV] = useState(false);
  const [canJoinCall, setCanJoinCall] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const appointmentDate = new Date(appointmentTime);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    
    setTimeUntilAppointment(timeDiff);
    setIsEarly(timeDiff > 5 * 60 * 1000); // More than 5 minutes early
    
    // Allow joining 5 minutes before appointment time
    setCanJoinCall(timeDiff <= 5 * 60 * 1000 && timeDiff > -30 * 60 * 1000);

    const timer = setInterval(() => {
      const newNow = new Date();
      const newTimeDiff = appointmentDate.getTime() - newNow.getTime();
      setTimeUntilAppointment(newTimeDiff);
      setCanJoinCall(newTimeDiff <= 5 * 60 * 1000 && newTimeDiff > -30 * 60 * 1000);
    }, 1000);

    return () => clearInterval(timer);
  }, [appointmentTime]);

  useEffect(() => {
    // Simulate participant status updates
    const updateParticipants = () => {
      const mockParticipants: ParticipantStatus[] = [
        {
          id: 'current-user',
          name: userRole === 'patient' ? (patientName || 'You') : (doctorName || 'You'),
          role: userRole,
          isOnline: true,
          joinedAt: new Date()
        }
      ];

      // Simulate other participant joining
      if (Math.random() > 0.7) {
        mockParticipants.push({
          id: 'other-participant',
          name: userRole === 'patient' ? (doctorName || 'Doctor') : (patientName || 'Patient'),
          role: userRole === 'patient' ? 'doctor' : 'patient',
          isOnline: true,
          joinedAt: new Date(Date.now() - Math.random() * 60000)
        });
      }

      setParticipants(mockParticipants);
    };

    updateParticipants();
    const interval = setInterval(updateParticipants, 10000);
    return () => clearInterval(interval);
  }, [userRole, doctorName, patientName]);

  useEffect(() => {
    if (isVideoEnabled) {
      startVideoPreview();
    } else {
      stopVideoPreview();
    }

    return () => stopVideoPreview();
  }, [isVideoEnabled]);

  const startVideoPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false // We'll handle audio separately
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
    } catch (error) {
      console.error('Error starting video preview:', error);
      setIsVideoEnabled(false);
    }
  };

  const stopVideoPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const testAudioVideo = async () => {
    setIsTestingAV(true);
    try {
      // Test microphone
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(track => track.stop());
      
      // Test camera (already done if video is enabled)
      if (!isVideoEnabled) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
      }

      // Simulate connection quality test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const qualities = ['excellent', 'good', 'fair', 'poor'] as const;
      setConnectionQuality(qualities[Math.floor(Math.random() * qualities.length)]);
      
    } catch (error) {
      console.error('Error testing A/V:', error);
      setConnectionQuality('poor');
    } finally {
      setIsTestingAV(false);
    }
  };

  const formatTimeUntilAppointment = (milliseconds: number) => {
    if (milliseconds <= 0) {
      return 'Appointment time has arrived';
    }

    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s until appointment`;
    } else {
      return `${seconds}s until appointment`;
    }
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'fair':
      case 'poor':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Waiting Room Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Waiting Room</span>
            </CardTitle>
            <CardDescription>
              {isEarly 
                ? 'You\'re early! Please wait until your appointment time.'
                : 'Your appointment is ready. You can join the call now.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {formatTimeUntilAppointment(timeUntilAppointment)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Scheduled for {new Date(appointmentTime).toLocaleTimeString()}
                </p>
              </div>
              <Badge variant={canJoinCall ? 'default' : 'secondary'}>
                {canJoinCall ? 'Ready to Join' : 'Please Wait'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Participants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Participants</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {participant.role}
                        {participant.joinedAt && (
                          <span className="ml-2">
                            • Joined {participant.joinedAt.toLocaleTimeString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={participant.isOnline ? 'default' : 'secondary'}>
                    {participant.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Video Preview and Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Video Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Video Preview</CardTitle>
            <CardDescription>
              This is how you will appear to the other participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {isVideoEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-64 object-cover rounded-lg border bg-gray-100"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Camera is off</p>
                  </div>
                </div>
              )}
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <Button
                  size="sm"
                  variant={isVideoEnabled ? "default" : "secondary"}
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                >
                  {isVideoEnabled ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={isAudioEnabled ? "default" : "secondary"}
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                >
                  {isAudioEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Check your connection and device status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Quality */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Wifi className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Connection Quality</p>
                  <p className={`text-sm ${getConnectionQualityColor(connectionQuality)}`}>
                    {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
                  </p>
                </div>
              </div>
              <div className={getConnectionQualityColor(connectionQuality)}>
                {getConnectionQualityIcon(connectionQuality)}
              </div>
            </div>

            {/* Camera Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Camera</p>
                  <p className="text-sm text-muted-foreground">
                    {isVideoEnabled ? 'Ready' : 'Disabled'}
                  </p>
                </div>
              </div>
              {isVideoEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>

            {/* Microphone Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Mic className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Microphone</p>
                  <p className="text-sm text-muted-foreground">
                    {isAudioEnabled ? 'Ready' : 'Muted'}
                  </p>
                </div>
              </div>
              {isAudioEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>

            {/* Test Button */}
            <Button
              onClick={testAudioVideo}
              disabled={isTestingAV}
              variant="outline"
              className="w-full"
            >
              {isTestingAV ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Test Audio & Video
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={onLeaveWaiting}
                variant="outline"
              >
                Leave Waiting Room
              </Button>
              <Button
                onClick={onJoinCall}
                disabled={!canJoinCall}
                className="bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-4 w-4 mr-2" />
                {canJoinCall ? 'Join Video Call' : 'Please Wait'}
              </Button>
            </div>
            
            {!canJoinCall && isEarly && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                You can join the call up to 5 minutes before your appointment time
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
