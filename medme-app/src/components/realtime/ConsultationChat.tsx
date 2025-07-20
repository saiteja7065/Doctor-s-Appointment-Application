'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  MessageCircle,
  User,
  Stethoscope,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConsultationChatProps {
  sessionId: string;
  className?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

interface ChatMessage {
  userId: string;
  role: 'patient' | 'doctor';
  message: string;
  timestamp: string;
  sessionId: string;
}

export default function ConsultationChat({
  sessionId,
  className = '',
  isMinimized = false,
  onToggleMinimize
}: ConsultationChatProps) {
  const { user } = useUser();
  const {
    isConnected,
    consultationMessages,
    typingUsers,
    joinConsultation,
    leaveConsultation,
    sendConsultationMessage,
    startTyping,
    stopTyping
  } = useWebSocket();

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter messages for this consultation
  useEffect(() => {
    const sessionMessages = consultationMessages.filter(
      msg => msg.sessionId === sessionId
    );
    setMessages(sessionMessages);
  }, [consultationMessages, sessionId]);

  // Join consultation room on mount
  useEffect(() => {
    if (isConnected && sessionId) {
      joinConsultation(sessionId);
    }

    return () => {
      if (sessionId) {
        leaveConsultation(sessionId);
      }
    };
  }, [isConnected, sessionId, joinConsultation, leaveConsultation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(sessionId);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(sessionId);
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(sessionId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!message.trim() || !isConnected) return;

    sendConsultationMessage(sessionId, message.trim());
    setMessage('');
    handleTypingStop();
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get user role icon
  const getRoleIcon = (role: 'patient' | 'doctor') => {
    return role === 'doctor' ? (
      <Stethoscope className="h-4 w-4" />
    ) : (
      <User className="h-4 w-4" />
    );
  };

  // Get current user role
  const currentUserRole = user?.publicMetadata?.role as 'patient' | 'doctor' || 'patient';

  // Filter typing users (exclude current user)
  const otherTypingUsers = typingUsers.filter(userId => userId !== user?.id);

  if (isMinimized) {
    return (
      <Card className={`w-80 ${className}`}>
        <CardHeader 
          className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <CardTitle className="text-sm">Consultation Chat</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {messages.length}
                </Badge>
              )}
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`w-80 h-96 flex flex-col ${className}`}>
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <CardTitle className="text-sm">Consultation Chat</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="outline" className="text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 space-y-3">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.userId === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      msg.userId === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      {getRoleIcon(msg.role)}
                      <span className="text-xs font-medium">
                        {msg.userId === user?.id ? 'You' : msg.role}
                      </span>
                      <Clock className="h-3 w-3 opacity-50" />
                      <span className="text-xs opacity-75">
                        {formatDistanceToNow(new Date(msg.timestamp), {
                          addSuffix: true
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicators */}
            {otherTypingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-2 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {otherTypingUsers.length === 1 ? 'Someone is' : 'Others are'} typing...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (e.target.value.trim()) {
                handleTypingStart();
              } else {
                handleTypingStop();
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center">
            <Badge variant="destructive" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Chat unavailable - Check connection
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
