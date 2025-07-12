'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Users,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface VonageVideoSessionProps {
  sessionId: string;
  token: string;
  role: 'patient' | 'doctor';
  onSessionEnd: () => void;
  onError: (error: string) => void;
}

interface ConnectionStats {
  videoBytesReceived: number;
  videoBytesSent: number;
  audioBytesReceived: number;
  audioBytesSent: number;
  videoPacketsLost: number;
  audioPacketsLost: number;
}

export default function VonageVideoSession({
  sessionId,
  token,
  role,
  onSessionEnd,
  onError
}: VonageVideoSessionProps) {
  // Video elements refs
  const publisherRef = useRef<HTMLDivElement>(null);
  const subscriberRef = useRef<HTMLDivElement>(null);
  
  // Vonage SDK refs
  const sessionRef = useRef<any>(null);
  const publisherInstanceRef = useRef<any>(null);
  const subscriberInstanceRef = useRef<any>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Vonage Video SDK
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsConnecting(true);
        
        // Check if we're in demo mode
        if (token.startsWith('demo_token_')) {
          // Demo mode - simulate connection
          setIsConnected(true);
          setConnectionCount(1);
          setIsPublishing(true);
          toast.success('Connected to consultation (Demo Mode)');
          return;
        }

        // Load Vonage Video SDK dynamically
        const OT = await loadVonageSDK();
        if (!OT) {
          throw new Error('Failed to load Vonage Video SDK');
        }

        // Initialize session
        const session = OT.initSession(sessionId);
        sessionRef.current = session;

        // Session event handlers
        session.on('sessionConnected', handleSessionConnected);
        session.on('sessionDisconnected', handleSessionDisconnected);
        session.on('streamCreated', handleStreamCreated);
        session.on('streamDestroyed', handleStreamDestroyed);
        session.on('connectionCreated', handleConnectionCreated);
        session.on('connectionDestroyed', handleConnectionDestroyed);

        // Connect to session
        session.connect(token, (error: any) => {
          if (error) {
            console.error('Failed to connect to session:', error);
            onError('Failed to connect to video session');
          }
        });

      } catch (error) {
        console.error('Error initializing video session:', error);
        setError('Failed to initialize video session');
        onError('Failed to initialize video session');
      } finally {
        setIsConnecting(false);
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, [sessionId, token]);

  // Load Vonage Video SDK
  const loadVonageSDK = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).OT) {
        resolve((window as any).OT);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://static.opentok.com/v2/js/opentok.min.js';
      script.async = true;
      script.onload = () => {
        resolve((window as any).OT);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Vonage Video SDK'));
      };
      document.head.appendChild(script);
    });
  };

  // Session event handlers
  const handleSessionConnected = () => {
    setIsConnected(true);
    toast.success('Connected to consultation');
    
    // Start publishing
    startPublishing();
  };

  const handleSessionDisconnected = () => {
    setIsConnected(false);
    setConnectionCount(0);
    toast.info('Disconnected from consultation');
  };

  const handleStreamCreated = (event: any) => {
    const stream = event.stream;
    
    // Subscribe to the stream
    if (sessionRef.current && subscriberRef.current) {
      const subscriber = sessionRef.current.subscribe(
        stream,
        subscriberRef.current,
        {
          insertMode: 'append',
          width: '100%',
          height: '100%',
          style: {
            buttonDisplayMode: 'off',
            nameDisplayMode: 'on'
          }
        }
      );

      subscriberInstanceRef.current = subscriber;
      
      // Monitor connection quality
      subscriber.on('videoNetworkStatsUpdated', (event: any) => {
        updateConnectionStats(event.stats);
      });
    }
  };

  const handleStreamDestroyed = () => {
    subscriberInstanceRef.current = null;
  };

  const handleConnectionCreated = () => {
    setConnectionCount(prev => prev + 1);
  };

  const handleConnectionDestroyed = () => {
    setConnectionCount(prev => Math.max(0, prev - 1));
  };

  // Start publishing video/audio
  const startPublishing = async () => {
    try {
      if (!sessionRef.current || !publisherRef.current) return;

      const OT = (window as any).OT;
      const publisher = OT.initPublisher(
        publisherRef.current,
        {
          insertMode: 'append',
          width: '100%',
          height: '100%',
          publishAudio: hasAudio,
          publishVideo: hasVideo,
          style: {
            buttonDisplayMode: 'off',
            nameDisplayMode: 'on'
          }
        }
      );

      publisherInstanceRef.current = publisher;

      sessionRef.current.publish(publisher, (error: any) => {
        if (error) {
          console.error('Failed to publish:', error);
          toast.error('Failed to start camera/microphone');
        } else {
          setIsPublishing(true);
          toast.success('Camera and microphone started');
        }
      });

    } catch (error) {
      console.error('Error starting publisher:', error);
      toast.error('Failed to start camera/microphone');
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (publisherInstanceRef.current) {
      publisherInstanceRef.current.publishVideo(!hasVideo);
      setHasVideo(!hasVideo);
      toast.info(hasVideo ? 'Camera turned off' : 'Camera turned on');
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (publisherInstanceRef.current) {
      publisherInstanceRef.current.publishAudio(!hasAudio);
      setHasAudio(!hasAudio);
      toast.info(hasAudio ? 'Microphone muted' : 'Microphone unmuted');
    }
  };

  // End session
  const endSession = () => {
    if (sessionRef.current) {
      sessionRef.current.disconnect();
    }
    onSessionEnd();
  };

  // Update connection stats
  const updateConnectionStats = (stats: any) => {
    setConnectionStats({
      videoBytesReceived: stats.videoBytesReceived || 0,
      videoBytesSent: stats.videoBytesSent || 0,
      audioBytesReceived: stats.audioBytesReceived || 0,
      audioBytesSent: stats.audioBytesSent || 0,
      videoPacketsLost: stats.videoPacketsLost || 0,
      audioPacketsLost: stats.audioPacketsLost || 0,
    });

    // Determine connection quality
    const totalPacketsLost = (stats.videoPacketsLost || 0) + (stats.audioPacketsLost || 0);
    if (totalPacketsLost === 0) {
      setConnectionQuality('excellent');
    } else if (totalPacketsLost < 10) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  };

  // Get connection quality icon
  const getConnectionQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
        {/* Remote video (subscriber) */}
        <div 
          ref={subscriberRef} 
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Local video (publisher) - Picture in Picture */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
          <div 
            ref={publisherRef} 
            className="w-full h-full"
          />
        </div>

        {/* Connection status */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            <Users className="h-3 w-3 mr-1" />
            {connectionCount} connected
          </Badge>
          <Badge variant="outline">
            {getConnectionQualityIcon()}
            <span className="ml-1 capitalize">{connectionQuality}</span>
          </Badge>
        </div>

        {/* Demo mode indicator */}
        {token.startsWith('demo_token_') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Video consultation active</p>
              <p className="text-sm opacity-75">Demo Mode - Real video would appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <Button
          variant={hasVideo ? "default" : "secondary"}
          size="sm"
          onClick={toggleVideo}
          className="rounded-full"
        >
          {hasVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        
        <Button
          variant={hasAudio ? "default" : "secondary"}
          size="sm"
          onClick={toggleAudio}
          className="rounded-full"
        >
          {hasAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={endSession}
          className="rounded-full"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
