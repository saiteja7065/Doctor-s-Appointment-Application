'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Settings, 
  MessageSquare,
  MoreVertical,
  Monitor,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface VideoControlsProps {
  onEndCall: () => void;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleChat: () => void;
  onToggleScreenShare?: () => void;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  speakerEnabled: boolean;
  isScreenSharing?: boolean;
  callDuration: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export default function VideoControls({
  onEndCall,
  onToggleCamera,
  onToggleMicrophone,
  onToggleChat,
  onToggleScreenShare,
  cameraEnabled,
  microphoneEnabled,
  speakerEnabled,
  isScreenSharing = false,
  callDuration,
  connectionQuality
}: VideoControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left side - Call info */}
        <div className="flex items-center gap-4 text-white">
          <div className="text-sm font-medium">
            {callDuration}
          </div>
          <Badge 
            variant="outline" 
            className={`${getConnectionColor(connectionQuality)} text-white border-white/20`}
          >
            {connectionQuality}
          </Badge>
        </div>

        {/* Center - Main controls */}
        <div className="flex items-center gap-3">
          {/* Camera toggle */}
          <Button
            variant={cameraEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={onToggleCamera}
          >
            {cameraEnabled ? (
              <Camera className="h-5 w-5" />
            ) : (
              <CameraOff className="h-5 w-5" />
            )}
          </Button>

          {/* Microphone toggle */}
          <Button
            variant={microphoneEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={onToggleMicrophone}
          >
            {microphoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          {/* End call */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0 bg-red-600 hover:bg-red-700"
            onClick={onEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Screen share (if available) */}
          {onToggleScreenShare && (
            <Button
              variant={isScreenSharing ? "default" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={onToggleScreenShare}
            >
              <Monitor className="h-5 w-5" />
            </Button>
          )}

          {/* Chat toggle */}
          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0 text-white border-white/20 hover:bg-white/10"
            onClick={onToggleChat}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - Additional controls */}
        <div className="flex items-center gap-2">
          {/* Speaker indicator */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
          >
            {speakerEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Monitor className="h-4 w-4 mr-2" />
                Full Screen
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <PhoneOff className="h-4 w-4 mr-2" />
                Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick settings panel */}
      {showSettings && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px]">
          <h3 className="font-semibold mb-3">Quick Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Camera Quality</span>
              <select className="text-sm border rounded px-2 py-1">
                <option>Auto</option>
                <option>720p</option>
                <option>480p</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Microphone</span>
              <select className="text-sm border rounded px-2 py-1">
                <option>Default</option>
                <option>Built-in Microphone</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Speaker</span>
              <select className="text-sm border rounded px-2 py-1">
                <option>Default</option>
                <option>Built-in Speakers</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
