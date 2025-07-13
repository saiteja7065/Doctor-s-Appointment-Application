'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  AlertTriangle, 
  User, 
  Stethoscope,
  Clock,
  CheckCircle,
  Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor';
  message: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'system' | 'emergency';
}

interface ChatFallbackProps {
  isVisible?: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'patient' | 'doctor';
  appointmentId: string;
  onSendMessage?: (message: string) => Promise<void>;
  onClose?: () => void;
  isVideoCallFailed?: boolean;
  isAudioCallFailed?: boolean;
}

export default function ChatFallback({
  isVisible = false,
  currentUserId,
  currentUserName,
  currentUserRole,
  appointmentId,
  onSendMessage,
  onClose,
  isVideoCallFailed = false,
  isAudioCallFailed = false
}: ChatFallbackProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  // Initialize with system message when chat opens due to call failure
  useEffect(() => {
    if (isVisible && (isVideoCallFailed || isAudioCallFailed)) {
      const systemMessage: ChatMessage = {
        id: `system_${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'patient', // Doesn't matter for system messages
        message: isVideoCallFailed && isAudioCallFailed 
          ? 'Video and audio connection failed. You can continue your consultation using this text chat.'
          : isVideoCallFailed 
          ? 'Video connection failed. Audio is still available, or you can use this text chat as backup.'
          : 'Audio connection issues detected. You can continue your consultation using this text chat.',
        timestamp: new Date(),
        status: 'delivered',
        type: 'system'
      };

      setMessages([systemMessage]);
    }
  }, [isVisible, isVideoCallFailed, isAudioCallFailed]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      message: messageText,
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      // Call the onSendMessage prop if provided
      if (onSendMessage) {
        await onSendMessage(messageText);
      }

      // Update message status to sent
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'sent' as const, id: `msg_${Date.now()}` }
            : msg
        )
      );

      // Simulate delivery confirmation after a short delay
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.senderId === currentUserId && msg.status === 'sent'
              ? { ...msg, status: 'delivered' as const }
              : msg
          )
        );
      }, 1000);

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Circle className="h-3 w-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'read':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-teal-600" />
              <CardTitle>Consultation Chat</CardTitle>
              {(isVideoCallFailed || isAudioCallFailed) && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Fallback Mode
                </Badge>
              )}
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
          
          {(isVideoCallFailed || isAudioCallFailed) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Connection issues detected. Use this chat to continue your consultation.
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${
                      message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'system'
                          ? 'bg-gray-100 text-gray-700 text-center mx-auto'
                          : message.senderId === currentUserId
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.type !== 'system' && (
                        <div className="flex items-center gap-2 mb-1">
                          {message.senderRole === 'doctor' ? (
                            <Stethoscope className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">
                            {message.senderName}
                          </span>
                          <span className="text-xs opacity-70">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      
                      {message.type !== 'system' && message.senderId === currentUserId && (
                        <div className="flex justify-end mt-1">
                          {getMessageStatusIcon(message.status)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Enter to send</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Messages are saved for this consultation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
