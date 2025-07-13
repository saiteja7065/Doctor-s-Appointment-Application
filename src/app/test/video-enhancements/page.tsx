'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PreCallScreen from '@/components/consultation/PreCallScreen';
import VideoControls from '@/components/consultation/VideoControls';
import ChatFallback from '@/components/consultation/ChatFallback';
import { Video, MessageCircle, Settings } from 'lucide-react';

export default function VideoEnhancementsTestPage() {
  const [currentDemo, setCurrentDemo] = useState<'precall' | 'controls' | 'chat' | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [bandwidthSavingMode, setBandwidthSavingMode] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [showChatFallback, setShowChatFallback] = useState(false);

  const handleSendChatMessage = async (message: string) => {
    console.log('Demo chat message:', message);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const demoAppointmentTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Video Consultation Enhancements</h1>
          <p className="text-gray-600">VC-FEAT-001, VC-FEAT-002, VC-FEAT-003 Implementation Demo</p>
        </div>

        {/* Demo Selection */}
        {!currentDemo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pre-Call Screen Demo */}
            <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setCurrentDemo('precall')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-teal-600" />
                  VC-FEAT-001
                </CardTitle>
                <Badge variant="secondary">Pre-Call Screen</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Enhanced pre-call screen with countdown timer, system checks, and appointment details.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Real-time countdown to appointment</li>
                  <li>• Camera/microphone system checks</li>
                  <li>• Connection quality assessment</li>
                  <li>• Early join capability (15 min before)</li>
                </ul>
              </CardContent>
            </Card>

            {/* Video Controls Demo */}
            <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setCurrentDemo('controls')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-teal-600" />
                  VC-FEAT-002
                </CardTitle>
                <Badge variant="secondary">Manual Video Toggle</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Advanced video controls with bandwidth saving mode and quality management.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Manual video/audio toggle</li>
                  <li>• Bandwidth saving mode</li>
                  <li>• Call quality indicators</li>
                  <li>• Fullscreen controls</li>
                </ul>
              </CardContent>
            </Card>

            {/* Chat Fallback Demo */}
            <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setCurrentDemo('chat')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-teal-600" />
                  VC-FEAT-003
                </CardTitle>
                <Badge variant="secondary">Text Chat Fallback</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Text chat fallback for communication when video/audio fails.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Real-time text messaging</li>
                  <li>• Message status indicators</li>
                  <li>• Emergency communication</li>
                  <li>• Professional medical theme</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Demo Content */}
        {currentDemo === 'precall' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">VC-FEAT-001: Pre-Call Screen with Countdown Timer</h2>
              <Button variant="outline" onClick={() => setCurrentDemo(null)}>
                Back to Menu
              </Button>
            </div>
            <PreCallScreen
              appointmentTime={demoAppointmentTime}
              patientName="John Doe"
              doctorName="Sarah Johnson"
              duration={30}
              onJoinCall={() => alert('Joining consultation...')}
              onSystemCheck={() => alert('Running system check...')}
              isSystemCheckPassed={true}
            />
          </div>
        )}

        {currentDemo === 'controls' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">VC-FEAT-002: Manual Video Toggle & Advanced Controls</h2>
              <Button variant="outline" onClick={() => setCurrentDemo(null)}>
                Back to Menu
              </Button>
            </div>
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Video Controls Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Simulated Video Area */}
                <div className="bg-gray-900 rounded-lg h-64 relative flex items-center justify-center">
                  <div className="text-white text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Simulated Video Call</p>
                    <p className="text-sm opacity-75">
                      Status: {isVideoEnabled ? 'Video On' : 'Video Off'} | 
                      {isAudioEnabled ? ' Audio On' : ' Audio Off'} |
                      {bandwidthSavingMode ? ' Bandwidth Saving' : ' HD Quality'}
                    </p>
                  </div>
                </div>

                {/* Video Controls */}
                <VideoControls
                  isVideoEnabled={isVideoEnabled}
                  isAudioEnabled={isAudioEnabled}
                  isMuted={isMuted}
                  isCallActive={true}
                  onVideoToggle={setIsVideoEnabled}
                  onAudioToggle={setIsAudioEnabled}
                  onMuteToggle={setIsMuted}
                  onEndCall={() => alert('Ending call...')}
                  showAdvancedControls={true}
                  connectionQuality={connectionQuality}
                  bandwidthSavingMode={bandwidthSavingMode}
                  onBandwidthModeToggle={setBandwidthSavingMode}
                />

                {/* Quality Controls */}
                <div className="flex items-center gap-4 justify-center">
                  <span className="text-sm font-medium">Simulate Connection Quality:</span>
                  {(['excellent', 'good', 'fair', 'poor'] as const).map((quality) => (
                    <Button
                      key={quality}
                      variant={connectionQuality === quality ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConnectionQuality(quality)}
                    >
                      {quality}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentDemo === 'chat' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">VC-FEAT-003: Text Chat Fallback</h2>
              <Button variant="outline" onClick={() => setCurrentDemo(null)}>
                Back to Menu
              </Button>
            </div>
            
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    This chat fallback system activates when video or audio connections fail, 
                    ensuring continuous communication during consultations.
                  </p>
                  
                  <Button 
                    onClick={() => setShowChatFallback(true)}
                    className="w-full"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open Chat Fallback Demo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ChatFallback
              isVisible={showChatFallback}
              currentUserId="demo-user-123"
              currentUserName="Demo User"
              currentUserRole="patient"
              appointmentId="demo-appointment-456"
              onSendMessage={handleSendChatMessage}
              onClose={() => setShowChatFallback(false)}
              isVideoCallFailed={true}
              isAudioCallFailed={false}
            />
          </div>
        )}

        {/* Implementation Notes */}
        {!currentDemo && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Implementation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-teal-600 mb-2">VC-FEAT-001: Pre-Call Screen</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time countdown calculation</li>
                    <li>• WebRTC system checks</li>
                    <li>• Network quality assessment</li>
                    <li>• Professional medical theming</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-teal-600 mb-2">VC-FEAT-002: Video Controls</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Bandwidth optimization</li>
                    <li>• Quality indicators</li>
                    <li>• Advanced control options</li>
                    <li>• Accessibility features</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-teal-600 mb-2">VC-FEAT-003: Chat Fallback</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time messaging</li>
                    <li>• Message persistence</li>
                    <li>• Emergency communication</li>
                    <li>• Professional interface</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
