'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Video, 
  Mic, 
  Monitor, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Calendar,
  User,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreCallScreenProps {
  appointmentTime: string;
  patientName?: string;
  doctorName?: string;
  duration?: number;
  onJoinCall: () => void;
  onSystemCheck?: () => void;
  isSystemCheckPassed?: boolean;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface SystemStatus {
  camera: 'checking' | 'available' | 'unavailable' | 'denied';
  microphone: 'checking' | 'available' | 'unavailable' | 'denied';
  connection: 'checking' | 'good' | 'fair' | 'poor';
}

export default function PreCallScreen({
  appointmentTime,
  patientName,
  doctorName,
  duration = 30,
  onJoinCall,
  onSystemCheck,
  isSystemCheckPassed = false
}: PreCallScreenProps) {
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAppointmentTime, setIsAppointmentTime] = useState(false);
  const [canJoinEarly, setCanJoinEarly] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    camera: 'checking',
    microphone: 'checking',
    connection: 'checking'
  });
  const [isSystemCheckComplete, setIsSystemCheckComplete] = useState(false);

  // Calculate countdown to appointment time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const appointmentDate = new Date(appointmentTime).getTime();
      const difference = appointmentDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });

        // Allow joining 15 minutes early
        const fifteenMinutesEarly = 15 * 60 * 1000;
        setCanJoinEarly(difference <= fifteenMinutesEarly);
        
        // Check if it's appointment time (within 5 minutes)
        const fiveMinutesBuffer = 5 * 60 * 1000;
        setIsAppointmentTime(difference <= fiveMinutesBuffer);
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsAppointmentTime(true);
        setCanJoinEarly(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [appointmentTime]);

  // Perform system checks
  useEffect(() => {
    const performSystemChecks = async () => {
      // Check camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setSystemStatus(prev => ({ ...prev, camera: 'available' }));
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setSystemStatus(prev => ({ 
          ...prev, 
          camera: error.name === 'NotAllowedError' ? 'denied' : 'unavailable' 
        }));
      }

      // Check microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setSystemStatus(prev => ({ ...prev, microphone: 'available' }));
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setSystemStatus(prev => ({ 
          ...prev, 
          microphone: error.name === 'NotAllowedError' ? 'denied' : 'unavailable' 
        }));
      }

      // Check connection (simplified)
      const connectionStart = performance.now();
      try {
        await fetch('/api/health', { method: 'HEAD' });
        const connectionTime = performance.now() - connectionStart;
        const connectionQuality = connectionTime < 100 ? 'good' : connectionTime < 300 ? 'fair' : 'poor';
        setSystemStatus(prev => ({ ...prev, connection: connectionQuality }));
      } catch (error) {
        setSystemStatus(prev => ({ ...prev, connection: 'poor' }));
      }

      setIsSystemCheckComplete(true);
    };

    performSystemChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fair':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unavailable':
      case 'denied':
      case 'poor':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300 animate-pulse" />;
    }
  };

  const getStatusText = (type: string, status: string) => {
    if (status === 'checking') return 'Checking...';
    
    switch (type) {
      case 'camera':
        switch (status) {
          case 'available': return 'Camera ready';
          case 'unavailable': return 'Camera not found';
          case 'denied': return 'Camera access denied';
          default: return 'Camera status unknown';
        }
      case 'microphone':
        switch (status) {
          case 'available': return 'Microphone ready';
          case 'unavailable': return 'Microphone not found';
          case 'denied': return 'Microphone access denied';
          default: return 'Microphone status unknown';
        }
      case 'connection':
        switch (status) {
          case 'good': return 'Excellent connection';
          case 'fair': return 'Good connection';
          case 'poor': return 'Poor connection';
          default: return 'Connection status unknown';
        }
      default:
        return 'Unknown status';
    }
  };

  const formatCountdownTime = (time: CountdownTime) => {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h ${time.minutes}m`;
    } else if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
    } else {
      return `${time.minutes}m ${time.seconds}s`;
    }
  };

  const getCountdownProgress = () => {
    const totalSeconds = countdown.days * 86400 + countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
    const maxSeconds = 24 * 3600; // 24 hours max for progress calculation
    return Math.max(0, Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100));
  };

  const allSystemsReady = systemStatus.camera === 'available' && 
                          systemStatus.microphone === 'available' && 
                          systemStatus.connection !== 'poor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-gray-900">Video Consultation</h1>
          <p className="text-gray-600">Prepare for your upcoming appointment</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-teal-600" />
                  Appointment Countdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={formatCountdownTime(countdown)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-4xl font-bold text-teal-600 mb-2"
                    >
                      {isAppointmentTime ? 'Ready to Join!' : formatCountdownTime(countdown)}
                    </motion.div>
                  </AnimatePresence>
                  
                  <Progress value={getCountdownProgress()} className="mb-4" />
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(appointmentTime).toLocaleDateString()} at{' '}
                      {new Date(appointmentTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration: {duration} minutes
                    </div>
                  </div>
                </div>

                {canJoinEarly && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <Badge variant="secondary" className="mb-2">
                      You can join up to 15 minutes early
                    </Badge>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-teal-600" />
                  System Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Camera</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.camera)}
                      <span className="text-sm">{getStatusText('camera', systemStatus.camera)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Microphone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.microphone)}
                      <span className="text-sm">{getStatusText('microphone', systemStatus.microphone)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.connection)}
                      <span className="text-sm">{getStatusText('connection', systemStatus.connection)}</span>
                    </div>
                  </div>
                </div>

                {isSystemCheckComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-4 border-t"
                  >
                    {allSystemsReady ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">All systems ready!</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Some issues detected</span>
                        </div>
                        {onSystemCheck && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onSystemCheck}
                            className="w-full"
                          >
                            Run Full System Check
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Appointment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-sm text-gray-500">Patient</p>
                      <p className="font-medium">{patientName}</p>
                    </div>
                  </div>
                )}

                {doctorName && (
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-sm text-gray-500">Doctor</p>
                      <p className="font-medium">Dr. {doctorName}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Join Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button
            onClick={onJoinCall}
            disabled={!canJoinEarly || !isSystemCheckComplete}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            <Video className="h-5 w-5 mr-2" />
            {isAppointmentTime ? 'Join Consultation' : 'Join Early'}
          </Button>

          {!canJoinEarly && (
            <p className="text-sm text-gray-500 mt-2">
              You can join the consultation 15 minutes before the scheduled time
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
