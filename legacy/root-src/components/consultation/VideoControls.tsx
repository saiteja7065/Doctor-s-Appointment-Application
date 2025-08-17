'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Monitor,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize,
  Minimize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface VideoControlsProps {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isMuted?: boolean;
  isCallActive?: boolean;
  onVideoToggle?: (enabled: boolean) => void;
  onAudioToggle?: (enabled: boolean) => void;
  onMuteToggle?: (muted: boolean) => void;
  onEndCall?: () => void;
  onSettingsOpen?: () => void;
  showAdvancedControls?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  bandwidthSavingMode?: boolean;
  onBandwidthModeToggle?: (enabled: boolean) => void;
}

interface CallStats {
  duration: string;
  quality: string;
  bandwidth: string;
}

export default function VideoControls({
  isVideoEnabled = true,
  isAudioEnabled = true,
  isMuted = false,
  isCallActive = false,
  onVideoToggle,
  onAudioToggle,
  onMuteToggle,
  onEndCall,
  onSettingsOpen,
  showAdvancedControls = false,
  connectionQuality = 'good',
  bandwidthSavingMode = false,
  onBandwidthModeToggle
}: VideoControlsProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Update call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoToggle = () => {
    const newState = !isVideoEnabled;
    onVideoToggle?.(newState);
    
    if (newState) {
      toast.success('Video enabled');
    } else {
      toast.info('Video disabled - Audio-only mode');
    }
  };

  const handleAudioToggle = () => {
    const newState = !isAudioEnabled;
    onAudioToggle?.(newState);
    
    if (newState) {
      toast.success('Microphone enabled');
    } else {
      toast.info('Microphone disabled');
    }
  };

  const handleMuteToggle = () => {
    const newState = !isMuted;
    onMuteToggle?.(newState);
    
    if (newState) {
      toast.info('Audio muted');
    } else {
      toast.success('Audio unmuted');
    }
  };

  const handleBandwidthModeToggle = () => {
    const newState = !bandwidthSavingMode;
    onBandwidthModeToggle?.(newState);
    
    if (newState) {
      toast.info('Bandwidth saving mode enabled - Video quality reduced');
    } else {
      toast.success('High quality mode enabled');
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      toast.info('Entered fullscreen mode');
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
      toast.info('Exited fullscreen mode');
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityBadgeVariant = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Call Status Bar */}
      {isCallActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                {formatDuration(callDuration)}
              </span>
            </div>
            
            <Badge variant={getQualityBadgeVariant(connectionQuality)} className="text-xs">
              {connectionQuality.toUpperCase()}
            </Badge>

            {bandwidthSavingMode && (
              <Badge variant="outline" className="text-xs">
                BANDWIDTH SAVING
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="text-white hover:bg-white/10"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Call Statistics */}
      <AnimatePresence>
        {showStats && isCallActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-white/70">Quality</p>
                    <p className={`text-sm font-medium ${getQualityColor(connectionQuality)}`}>
                      {connectionQuality}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Duration</p>
                    <p className="text-sm font-medium text-white">
                      {formatDuration(callDuration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Mode</p>
                    <p className="text-sm font-medium text-white">
                      {bandwidthSavingMode ? 'Audio Focus' : 'HD Video'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Audio Toggle */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={handleAudioToggle}
            className="rounded-full w-14 h-14"
          >
            {isAudioEnabled ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>
        </motion.div>

        {/* Video Toggle */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={isVideoEnabled ? "default" : "secondary"}
            size="lg"
            onClick={handleVideoToggle}
            className="rounded-full w-14 h-14"
          >
            {isVideoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </Button>
        </motion.div>

        {/* End Call */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="destructive"
            size="lg"
            onClick={onEndCall}
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </motion.div>
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          {/* Mute Toggle */}
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="sm"
            onClick={handleMuteToggle}
            className="rounded-full"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          {/* Bandwidth Saving Mode */}
          <Button
            variant={bandwidthSavingMode ? "default" : "outline"}
            size="sm"
            onClick={handleBandwidthModeToggle}
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreenToggle}
            className="rounded-full"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>

          {/* Settings */}
          {onSettingsOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSettingsOpen}
              className="rounded-full"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}

      {/* Bandwidth Saving Info */}
      <AnimatePresence>
        {bandwidthSavingMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
          >
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Bandwidth Saving Mode:</strong> Video quality reduced to improve audio clarity and reduce data usage.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
