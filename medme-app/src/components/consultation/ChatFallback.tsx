'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Phone, 
  Video, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'doctor' | 'patient' | 'system';
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'media';
}

interface ChatFallbackProps {
  onRetryVideo: () => void;
  onRetryAudio: () => void;
  onEndConsultation: () => void;
  userRole: 'doctor' | 'patient';
  otherPartyName: string;
  connectionIssue: 'video' | 'audio' | 'network' | 'general';
}

export default function ChatFallback({
  onRetryVideo,
  onRetryAudio,
  onEndConsultation,
  userRole,
  otherPartyName,
  connectionIssue
}: ChatFallbackProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'system',
      content: `Connection issue detected. You can continue your consultation via chat while we work to restore ${connectionIssue === 'video' ? 'video' : 'audio'} connection.`,
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate connection status
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.3); // 70% chance of being connected
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: userRole,
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate response from other party (for demo)
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: userRole === 'doctor' ? 'patient' : 'doctor',
        content: `Thank you for your message. I can see it clearly.`,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const getIssueDescription = () => {
    switch (connectionIssue) {
      case 'video':
        return 'Video connection lost. Audio and chat are still available.';
      case 'audio':
        return 'Audio connection lost. Video and chat are still available.';
      case 'network':
        return 'Network connection unstable. Chat is available as backup.';
      default:
        return 'Connection issues detected. Chat is available as backup.';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Connection Issue - Chat Mode
            </h1>
          </div>
          <p className="text-gray-600">{getIssueDescription()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection Status & Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-500" />
                  )}
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Network</span>
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? "Connected" : "Unstable"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chat</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Video</span>
                    <Badge variant="destructive">Disconnected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audio</span>
                    <Badge variant="destructive">Disconnected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Retry Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Reconnection Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={onRetryVideo}
                  className="w-full"
                  variant="outline"
                  disabled={!isConnected}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Retry Video Call
                </Button>
                <Button 
                  onClick={onRetryAudio}
                  className="w-full"
                  variant="outline"
                  disabled={!isConnected}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Retry Audio Call
                </Button>
                <Separator />
                <Button 
                  onClick={onEndConsultation}
                  className="w-full"
                  variant="destructive"
                >
                  End Consultation
                </Button>
              </CardContent>
            </Card>

            {/* Consultation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Consultation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">With:</span>
                    <span className="font-medium">{otherPartyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Started: {formatTime(new Date())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat with {otherPartyName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === userRole ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.type === 'system'
                            ? 'bg-amber-100 text-amber-800 mx-auto text-center'
                            : message.sender === userRole
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.type === 'system' 
                            ? 'text-amber-600' 
                            : message.sender === userRole 
                            ? 'text-blue-100' 
                            : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={!isConnected}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !isConnected}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-red-600 mt-2">
                      Connection unstable. Messages may be delayed.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
