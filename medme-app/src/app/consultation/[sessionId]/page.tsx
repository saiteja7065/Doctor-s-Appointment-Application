'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TechnicalPrerequisites from '@/components/consultation/TechnicalPrerequisites';
import WaitingRoom from '@/components/consultation/WaitingRoom';
import CallQualityManager from '@/components/consultation/CallQualityManager';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Monitor,
  Wifi,
  Camera,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import VonageVideoSession from '@/components/video/VonageVideoSession';
import PreCallScreen from '@/components/consultation/PreCallScreen';
import VideoControls from '@/components/consultation/VideoControls';
import ChatFallback from '@/components/consultation/ChatFallback';

interface ConsultationData {
  token: string;
  sessionId: string;
  role: 'patient' | 'doctor';
  appointmentId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  duration: number;
}

export default function VideoConsultationPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [consultationPhase, setConsultationPhase] = useState<'loading' | 'prerequisites' | 'waiting' | 'active' | 'ended'>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [useEnhancedVideo, setUseEnhancedVideo] = useState(true);

  // Enhanced video consultation states
  const [showPreCallScreen, setShowPreCallScreen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [bandwidthSavingMode, setBandwidthSavingMode] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [showChatFallback, setShowChatFallback] = useState(false);
  const [isVideoCallFailed, setIsVideoCallFailed] = useState(false);
  const [isAudioCallFailed, setIsAudioCallFailed] = useState(false);

  const videoRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const publisherRef = useRef<any>(null);

  useEffect(() => {
    if (isLoaded && user && sessionId) {
      fetchConsultationToken();
    }
  }, [isLoaded, user, sessionId]);

  useEffect(() => {
    // Update elapsed time every second when session is active
    let interval: NodeJS.Timeout;
    if (sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStartTime]);

  const fetchConsultationToken = async () => {
    try {
      const response = await fetch(`/api/consultations/${sessionId}/token`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get consultation token');
      }

      setConsultationData(data);

      // Check if we should show pre-call screen based on appointment time
      const appointmentTime = new Date(data.appointmentTime);
      const now = new Date();
      const timeDifference = appointmentTime.getTime() - now.getTime();
      const fifteenMinutes = 15 * 60 * 1000;

      if (timeDifference > fifteenMinutes) {
        setConsultationPhase('precall');
        setShowPreCallScreen(true);
      } else {
        // Move to prerequisites check after loading
        setConsultationPhase('prerequisites');
        setShowPreCallScreen(false);
      }

      // Initialize video session if we have a real token (not demo)
      if (!data.token.startsWith('demo_token_')) {
        await initializeVideoSession(data);
      } else {
        // Demo mode - simulate connection
        setIsConnected(true);
        setSessionStartTime(new Date());
        setConnectionCount(1);
      }

    } catch (error) {
      console.error('Error fetching consultation token:', error);
      setError(error instanceof Error ? error.message : 'Failed to join consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeVideoSession = async (data: ConsultationData) => {
    try {
      setIsConnecting(true);

      // Note: In a real implementation, you would load the Vonage Video SDK here
      // For now, we'll simulate the connection process
      
      // Simulate loading and connecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      setSessionStartTime(new Date());
      setConnectionCount(1);
      toast.success('Connected to consultation');

    } catch (error) {
      console.error('Error initializing video session:', error);
      setError('Failed to connect to video session');
      toast.error('Failed to connect to video session');
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // In real implementation, this would control the video stream
    toast.info(isVideoEnabled ? 'Video turned off' : 'Video turned on');
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    // In real implementation, this would control the audio stream
    toast.info(isAudioEnabled ? 'Microphone muted' : 'Microphone unmuted');
  };

  const handleEndConsultation = () => {
    endConsultation();
  };

  const endConsultation = async () => {
    try {
      const response = await fetch(`/api/consultations/${sessionId}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'end_session' }),
      });

      if (response.ok) {
        toast.success('Consultation ended successfully');
        setConsultationPhase('ended');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        throw new Error('Failed to end consultation');
      }
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast.error('Failed to end consultation');
    }
  };

  const handlePrerequisitesComplete = (allPassed: boolean) => {
    if (allPassed) {
      setConsultationPhase('waiting');
    } else {
      setError('Please resolve the technical issues before joining the consultation');
    }
  };

  const handleJoinCall = () => {
    setConsultationPhase('active');
    setIsConnected(true);
    setSessionStartTime(new Date());
    setConnectionCount(1);
  };

  const handleLeaveWaiting = () => {
    router.push('/dashboard');
  };

  // Enhanced video consultation handlers
  const handlePreCallJoin = () => {
    setShowPreCallScreen(false);
    setConsultationPhase('prerequisites');
  };

  const handleVideoToggle = (enabled: boolean) => {
    setIsVideoEnabled(enabled);
    if (!enabled && bandwidthSavingMode) {
      setBandwidthSavingMode(false);
    }
  };

  const handleAudioToggle = (enabled: boolean) => {
    setIsAudioEnabled(enabled);
    if (!enabled) {
      setIsMuted(true);
    }
  };

  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
  };

  const handleBandwidthModeToggle = (enabled: boolean) => {
    setBandwidthSavingMode(enabled);
    if (enabled) {
      setIsVideoEnabled(false);
      toast.info('Bandwidth saving mode: Video disabled for better audio quality');
    }
  };

  const handleQualityChange = (quality: any) => {
    if (quality.connectionStability) {
      setConnectionQuality(quality.connectionStability);
    }

    // Auto-enable chat fallback if connection is poor
    if (quality.connectionStability === 'poor' && !showChatFallback) {
      setIsVideoCallFailed(true);
      setIsAudioCallFailed(true);
      setShowChatFallback(true);
      toast.warning('Poor connection detected. Chat fallback is now available.');
    }
  };

  const handleSendChatMessage = async (message: string) => {
    // In a real implementation, this would send the message through the consultation API
    console.log('Sending chat message:', message);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleSystemCheck = () => {
    router.push(`/consultation/${sessionId}/check`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAppointmentTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading Consultation</h2>
            <p className="text-muted-foreground">
              Preparing your video consultation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Join Consultation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consultationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Consultation Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The consultation session could not be found or has expired.
            </p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show Pre-Call Screen
  if (consultationPhase === 'precall' && showPreCallScreen) {
    return (
      <PreCallScreen
        appointmentTime={consultationData.appointmentTime}
        patientName={consultationData.patientName}
        doctorName={consultationData.doctorName}
        duration={consultationData.duration}
        onJoinCall={handlePreCallJoin}
        onSystemCheck={handleSystemCheck}
        isSystemCheckPassed={true}
      />
    );
  }

  // Phase-based rendering
  if (consultationPhase === 'prerequisites') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <TechnicalPrerequisites
            onComplete={handlePrerequisitesComplete}
            autoStart={true}
          />
        </div>
      </div>
    );
  }

  if (consultationPhase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <WaitingRoom
            sessionId={sessionId as string}
            userRole={consultationData.userRole}
            appointmentTime={consultationData.appointmentTime}
            doctorName={consultationData.doctorName}
            patientName={consultationData.patientName}
            onJoinCall={handleJoinCall}
            onLeaveWaiting={handleLeaveWaiting}
          />
        </div>
      </div>
    );
  }

  if (consultationPhase === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Consultation Ended</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for using our consultation service. You will be redirected shortly.
            </p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
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
              <h1 className="text-xl font-semibold">Video Consultation</h1>
              <Badge variant="secondary">
                {consultationData.role === 'patient' ? 'Patient' : 'Doctor'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {sessionStartTime && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{connectionCount} connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Area */}
          <div className="lg:col-span-3">
            <Card className="glass-card h-[600px]">
              <CardContent className="p-0 h-full">
                {isConnecting ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-semibold mb-2">Connecting...</h3>
                      <p className="text-muted-foreground">
                        Establishing video connection
                      </p>
                    </div>
                  </div>
                ) : isConnected ? (
                  <div className="h-full bg-gray-900 rounded-lg relative overflow-hidden">
                    {/* Video placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Video consultation active</p>
                        <p className="text-sm opacity-75">
                          In a real implementation, Vonage Video SDK would render here
                        </p>
                      </div>
                    </div>
                    
                    {/* Enhanced Video Controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <VideoControls
                        isVideoEnabled={isVideoEnabled}
                        isAudioEnabled={isAudioEnabled}
                        isMuted={isMuted}
                        isCallActive={isConnected}
                        onVideoToggle={handleVideoToggle}
                        onAudioToggle={handleAudioToggle}
                        onMuteToggle={handleMuteToggle}
                        onEndCall={endConsultation}
                        showAdvancedControls={true}
                        connectionQuality={connectionQuality}
                        bandwidthSavingMode={bandwidthSavingMode}
                        onBandwidthModeToggle={handleBandwidthModeToggle}
                      />
                    </div>

                    {/* Chat Fallback Button */}
                    {(isVideoCallFailed || isAudioCallFailed) && (
                      <div className="absolute top-4 right-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowChatFallback(true)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Chat Fallback
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Ready to Connect</h3>
                      <p className="text-muted-foreground mb-4">
                        We recommend running a system check before joining your consultation
                      </p>
                      <div className="space-y-3">
                        <Link href={`/consultation/${sessionId}/check`}>
                          <Button variant="outline" className="w-full">
                            <Monitor className="h-4 w-4 mr-2" />
                            Run System Check
                          </Button>
                        </Link>
                        <Button onClick={() => initializeVideoSession(consultationData)} className="w-full">
                          <Video className="h-4 w-4 mr-2" />
                          Join Video Call
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Consultation Info */}
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Consultation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Video Settings</h4>
                  <div className="space-y-2">
                    <Button
                      variant={useEnhancedVideo ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseEnhancedVideo(!useEnhancedVideo)}
                      className="w-full"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      {useEnhancedVideo ? 'Enhanced Video' : 'Basic Video'}
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Participants</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Patient:</span>
                      <span className="text-sm font-medium">{consultationData.patientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Doctor:</span>
                      <span className="text-sm font-medium">{consultationData.doctorName}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Schedule</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Time:</span>
                      <span className="text-sm font-medium">
                        {formatAppointmentTime(consultationData.appointmentTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Duration:</span>
                      <span className="text-sm font-medium">{consultationData.duration} minutes</span>
                    </div>
                  </div>
                </div>

                {sessionStartTime && (
                  <div>
                    <h4 className="font-medium mb-2">Session</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Started:</span>
                        <span className="text-sm font-medium">
                          {sessionStartTime.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Elapsed:</span>
                        <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endConsultation}
                    className="w-full"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Consultation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Call Quality Manager */}
      <CallQualityManager
        sessionId={sessionId as string}
        isActive={consultationPhase === 'active' && isConnected}
        onQualityChange={handleQualityChange}
        onAdjustmentMade={(adjustment) => {
          console.log('Quality adjustment made:', adjustment);
        }}
      />

      {/* Chat Fallback */}
      <ChatFallback
        isVisible={showChatFallback}
        currentUserId={user?.id || ''}
        currentUserName={user?.fullName || 'User'}
        currentUserRole={consultationData?.role || 'patient'}
        appointmentId={consultationData?.appointmentId || ''}
        onSendMessage={handleSendChatMessage}
        onClose={() => setShowChatFallback(false)}
        isVideoCallFailed={isVideoCallFailed}
        isAudioCallFailed={isAudioCallFailed}
      />
    </div>
  );
}
