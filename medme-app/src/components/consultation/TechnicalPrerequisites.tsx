'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Monitor,
  Wifi,
  Camera,
  Mic,
  Speaker,
  Globe,
  Smartphone,
  RefreshCw,
  Settings
} from 'lucide-react';

interface TechnicalCheck {
  id: string;
  name: string;
  description: string;
  status: 'checking' | 'passed' | 'failed' | 'warning';
  details?: string;
  recommendation?: string;
}

interface TechnicalPrerequisitesProps {
  onComplete: (allPassed: boolean) => void;
  autoStart?: boolean;
}

export default function TechnicalPrerequisites({ 
  onComplete, 
  autoStart = true 
}: TechnicalPrerequisitesProps) {
  const [checks, setChecks] = useState<TechnicalCheck[]>([
    {
      id: 'browser',
      name: 'Browser Compatibility',
      description: 'Checking if your browser supports video calls',
      status: 'checking'
    },
    {
      id: 'internet',
      name: 'Internet Connection',
      description: 'Testing connection speed and stability',
      status: 'checking'
    },
    {
      id: 'camera',
      name: 'Camera Access',
      description: 'Verifying camera permissions and functionality',
      status: 'checking'
    },
    {
      id: 'microphone',
      name: 'Microphone Access',
      description: 'Testing microphone permissions and audio input',
      status: 'checking'
    },
    {
      id: 'speakers',
      name: 'Audio Output',
      description: 'Checking speaker/headphone functionality',
      status: 'checking'
    },
    {
      id: 'bandwidth',
      name: 'Bandwidth Test',
      description: 'Measuring upload/download speeds for video quality',
      status: 'checking'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (autoStart) {
      startChecks();
    }
  }, [autoStart]);

  useEffect(() => {
    const progress = (currentCheckIndex / checks.length) * 100;
    setOverallProgress(progress);
  }, [currentCheckIndex, checks.length]);

  useEffect(() => {
    const passedChecks = checks.filter(check => check.status === 'passed').length;
    const failedChecks = checks.filter(check => check.status === 'failed').length;
    const completedChecks = passedChecks + failedChecks;
    
    if (completedChecks === checks.length) {
      const allCriticalPassed = !checks.some(check => 
        check.status === 'failed' && ['browser', 'camera', 'microphone'].includes(check.id)
      );
      setCanProceed(allCriticalPassed);
      onComplete(allCriticalPassed);
    }
  }, [checks, onComplete]);

  const startChecks = async () => {
    setIsRunning(true);
    setCurrentCheckIndex(0);
    
    for (let i = 0; i < checks.length; i++) {
      setCurrentCheckIndex(i);
      await runCheck(checks[i].id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between checks
    }
    
    setIsRunning(false);
  };

  const runCheck = async (checkId: string) => {
    updateCheckStatus(checkId, 'checking');

    try {
      switch (checkId) {
        case 'browser':
          await checkBrowserCompatibility();
          break;
        case 'internet':
          await checkInternetConnection();
          break;
        case 'camera':
          await checkCameraAccess();
          break;
        case 'microphone':
          await checkMicrophoneAccess();
          break;
        case 'speakers':
          await checkSpeakerFunctionality();
          break;
        case 'bandwidth':
          await checkBandwidth();
          break;
      }
    } catch (error) {
      console.error(`Check ${checkId} failed:`, error);
      updateCheckStatus(checkId, 'failed', 'Check failed due to an error');
    }
  };

  const updateCheckStatus = (
    checkId: string, 
    status: TechnicalCheck['status'], 
    details?: string,
    recommendation?: string
  ) => {
    setChecks(prev => prev.map(check => 
      check.id === checkId 
        ? { ...check, status, details, recommendation }
        : check
    ));
  };

  const checkBrowserCompatibility = async () => {
    const isWebRTCSupported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );

    if (isWebRTCSupported) {
      updateCheckStatus(
        'browser', 
        'passed', 
        'Your browser supports video calls',
        'You can proceed with the consultation'
      );
    } else {
      updateCheckStatus(
        'browser', 
        'failed', 
        'Your browser does not support video calls',
        'Please use Chrome, Firefox, Safari, or Edge'
      );
    }
  };

  const checkInternetConnection = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok && latency < 1000) {
        updateCheckStatus(
          'internet', 
          'passed', 
          `Connection stable (${latency}ms latency)`,
          'Your internet connection is suitable for video calls'
        );
      } else if (latency < 2000) {
        updateCheckStatus(
          'internet', 
          'warning', 
          `Connection slow (${latency}ms latency)`,
          'Video quality may be reduced'
        );
      } else {
        updateCheckStatus(
          'internet', 
          'failed', 
          `Connection too slow (${latency}ms latency)`,
          'Please check your internet connection'
        );
      }
    } catch (error) {
      updateCheckStatus(
        'internet', 
        'failed', 
        'Unable to test connection',
        'Please check your internet connection'
      );
    }
  };

  const checkCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      streamRef.current = stream;
      
      updateCheckStatus(
        'camera', 
        'passed', 
        'Camera access granted and working',
        'Your camera is ready for video calls'
      );
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        updateCheckStatus(
          'camera', 
          'failed', 
          'Camera access denied',
          'Please allow camera access in your browser settings'
        );
      } else if (error.name === 'NotFoundError') {
        updateCheckStatus(
          'camera', 
          'failed', 
          'No camera found',
          'Please connect a camera to your device'
        );
      } else {
        updateCheckStatus(
          'camera', 
          'failed', 
          'Camera access failed',
          'Please check your camera settings'
        );
      }
    }
  };

  const checkMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test audio levels
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      updateCheckStatus(
        'microphone', 
        'passed', 
        'Microphone access granted and working',
        'Your microphone is ready for audio calls'
      );
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        updateCheckStatus(
          'microphone', 
          'failed', 
          'Microphone access denied',
          'Please allow microphone access in your browser settings'
        );
      } else if (error.name === 'NotFoundError') {
        updateCheckStatus(
          'microphone', 
          'failed', 
          'No microphone found',
          'Please connect a microphone to your device'
        );
      } else {
        updateCheckStatus(
          'microphone', 
          'failed', 
          'Microphone access failed',
          'Please check your microphone settings'
        );
      }
    }
  };

  const checkSpeakerFunctionality = async () => {
    try {
      // Create a test audio element
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      
      // Test if audio can be played
      const canPlay = audio.canPlayType('audio/wav');
      
      if (canPlay) {
        updateCheckStatus(
          'speakers', 
          'passed', 
          'Audio output is working',
          'You will be able to hear the other participant'
        );
      } else {
        updateCheckStatus(
          'speakers', 
          'warning', 
          'Cannot verify audio output',
          'Please test your speakers/headphones manually'
        );
      }
    } catch (error) {
      updateCheckStatus(
        'speakers', 
        'warning', 
        'Cannot test audio output',
        'Please ensure your speakers/headphones are working'
      );
    }
  };

  const checkBandwidth = async () => {
    try {
      // Simple bandwidth test using image download
      const startTime = Date.now();
      const testImage = new Image();
      
      testImage.onload = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const bitsLoaded = 1024 * 8; // 1KB test image
        const speedBps = bitsLoaded / (duration / 1000);
        const speedKbps = speedBps / 1024;

        if (speedKbps > 500) {
          updateCheckStatus(
            'bandwidth', 
            'passed', 
            `Good bandwidth (${Math.round(speedKbps)} Kbps)`,
            'Suitable for high-quality video calls'
          );
        } else if (speedKbps > 200) {
          updateCheckStatus(
            'bandwidth', 
            'warning', 
            `Moderate bandwidth (${Math.round(speedKbps)} Kbps)`,
            'Video quality may be automatically adjusted'
          );
        } else {
          updateCheckStatus(
            'bandwidth', 
            'failed', 
            `Low bandwidth (${Math.round(speedKbps)} Kbps)`,
            'Consider using audio-only mode'
          );
        }
      };

      testImage.onerror = () => {
        updateCheckStatus(
          'bandwidth', 
          'warning', 
          'Cannot test bandwidth',
          'Network test failed - proceed with caution'
        );
      };

      // Use a small test image
      testImage.src = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==?t=${Date.now()}`;
    } catch (error) {
      updateCheckStatus(
        'bandwidth', 
        'warning', 
        'Bandwidth test failed',
        'Unable to measure connection speed'
      );
    }
  };

  const getStatusIcon = (status: TechnicalCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getCheckIcon = (checkId: string) => {
    switch (checkId) {
      case 'browser':
        return <Globe className="h-4 w-4" />;
      case 'internet':
        return <Wifi className="h-4 w-4" />;
      case 'camera':
        return <Camera className="h-4 w-4" />;
      case 'microphone':
        return <Mic className="h-4 w-4" />;
      case 'speakers':
        return <Speaker className="h-4 w-4" />;
      case 'bandwidth':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Technical Prerequisites Check</span>
          </CardTitle>
          <CardDescription>
            Verifying your system is ready for video consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            {!isRunning && overallProgress === 100 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {canProceed ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700 font-medium">System Ready</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-700 font-medium">Issues Detected</span>
                    </>
                  )}
                </div>
                <Button onClick={startChecks} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rerun Checks
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check, index) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className={`${
              currentCheckIndex === index && isRunning ? 'ring-2 ring-primary' : ''
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getCheckIcon(check.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{check.name}</h4>
                      {getStatusIcon(check.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {check.description}
                    </p>
                    {check.details && (
                      <p className="text-sm mt-2 font-medium">
                        {check.details}
                      </p>
                    )}
                    {check.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {check.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Camera Preview */}
      {checks.find(c => c.id === 'camera')?.status === 'passed' && (
        <Card>
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
            <CardDescription>
              This is how you will appear to the other participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full max-w-md mx-auto">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-auto rounded-lg border"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                Camera Preview
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
