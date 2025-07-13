'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wifi,
  WifiOff,
  Signal,
  AlertTriangle,
  CheckCircle,
  Settings,
  Monitor,
  Volume2,
  Camera,
  Zap,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface CallQualityMetrics {
  bandwidth: {
    upload: number;
    download: number;
    unit: 'kbps' | 'mbps';
  };
  latency: number;
  packetLoss: number;
  jitter: number;
  videoQuality: 'auto' | 'high' | 'medium' | 'low';
  audioQuality: 'auto' | 'high' | 'medium' | 'low';
  connectionStability: 'excellent' | 'good' | 'fair' | 'poor';
}

interface QualityAdjustment {
  type: 'video' | 'audio' | 'bandwidth';
  action: 'upgrade' | 'downgrade' | 'maintain';
  reason: string;
  timestamp: Date;
}

interface CallQualityManagerProps {
  sessionId: string;
  isActive: boolean;
  onQualityChange?: (metrics: CallQualityMetrics) => void;
  onAdjustmentMade?: (adjustment: QualityAdjustment) => void;
}

export default function CallQualityManager({
  sessionId,
  isActive,
  onQualityChange,
  onAdjustmentMade
}: CallQualityManagerProps) {
  const [metrics, setMetrics] = useState<CallQualityMetrics>({
    bandwidth: { upload: 0, download: 0, unit: 'kbps' },
    latency: 0,
    packetLoss: 0,
    jitter: 0,
    videoQuality: 'auto',
    audioQuality: 'auto',
    connectionStability: 'good'
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [recentAdjustments, setRecentAdjustments] = useState<QualityAdjustment[]>([]);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [qualityTrend, setQualityTrend] = useState<'improving' | 'stable' | 'degrading'>('stable');

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qualityHistoryRef = useRef<CallQualityMetrics[]>([]);
  const adjustmentCooldownRef = useRef<{ [key: string]: Date }>({});

  // Start monitoring when call is active
  useEffect(() => {
    if (isActive && !isMonitoring) {
      startMonitoring();
    } else if (!isActive && isMonitoring) {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isActive]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Initial quality assessment
    assessCallQuality();
    
    // Set up continuous monitoring
    monitoringIntervalRef.current = setInterval(() => {
      assessCallQuality();
    }, 5000); // Check every 5 seconds
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);

  const assessCallQuality = async () => {
    try {
      // Simulate network quality assessment
      // In a real implementation, this would use WebRTC stats API
      const newMetrics = await simulateQualityAssessment();
      
      setMetrics(newMetrics);
      qualityHistoryRef.current.push(newMetrics);
      
      // Keep only last 20 measurements
      if (qualityHistoryRef.current.length > 20) {
        qualityHistoryRef.current = qualityHistoryRef.current.slice(-20);
      }

      // Analyze quality trend
      analyzeQualityTrend();

      // Auto-adjust if enabled
      if (autoAdjustEnabled) {
        await autoAdjustQuality(newMetrics);
      }

      // Notify parent component
      if (onQualityChange) {
        onQualityChange(newMetrics);
      }
    } catch (error) {
      console.error('Error assessing call quality:', error);
    }
  };

  const simulateQualityAssessment = async (): Promise<CallQualityMetrics> => {
    // Simulate network test
    const startTime = Date.now();
    
    try {
      // Test latency with a small request
      await fetch('/api/health', { method: 'HEAD' });
      const latency = Date.now() - startTime;

      // Simulate other metrics based on latency and random factors
      const baseQuality = latency < 100 ? 'excellent' : latency < 200 ? 'good' : latency < 400 ? 'fair' : 'poor';
      
      const bandwidth = {
        upload: Math.random() * 1000 + 500, // 500-1500 kbps
        download: Math.random() * 2000 + 1000, // 1000-3000 kbps
        unit: 'kbps' as const
      };

      const packetLoss = Math.random() * 5; // 0-5%
      const jitter = Math.random() * 50 + 10; // 10-60ms

      // Determine video/audio quality based on metrics
      let videoQuality: 'auto' | 'high' | 'medium' | 'low' = 'auto';
      let audioQuality: 'auto' | 'high' | 'medium' | 'low' = 'auto';

      if (bandwidth.download < 500 || packetLoss > 3) {
        videoQuality = 'low';
        audioQuality = 'medium';
      } else if (bandwidth.download < 1000 || packetLoss > 1.5) {
        videoQuality = 'medium';
        audioQuality = 'high';
      } else {
        videoQuality = 'high';
        audioQuality = 'high';
      }

      return {
        bandwidth,
        latency,
        packetLoss,
        jitter,
        videoQuality,
        audioQuality,
        connectionStability: baseQuality as any
      };
    } catch (error) {
      // Fallback metrics for poor connection
      return {
        bandwidth: { upload: 100, download: 200, unit: 'kbps' },
        latency: 1000,
        packetLoss: 10,
        jitter: 100,
        videoQuality: 'low',
        audioQuality: 'low',
        connectionStability: 'poor'
      };
    }
  };

  const analyzeQualityTrend = () => {
    if (qualityHistoryRef.current.length < 3) return;

    const recent = qualityHistoryRef.current.slice(-3);
    const avgLatency = recent.reduce((sum, m) => sum + m.latency, 0) / recent.length;
    const avgPacketLoss = recent.reduce((sum, m) => sum + m.packetLoss, 0) / recent.length;

    const older = qualityHistoryRef.current.slice(-6, -3);
    if (older.length === 0) return;

    const oldAvgLatency = older.reduce((sum, m) => sum + m.latency, 0) / older.length;
    const oldAvgPacketLoss = older.reduce((sum, m) => sum + m.packetLoss, 0) / older.length;

    const latencyChange = avgLatency - oldAvgLatency;
    const packetLossChange = avgPacketLoss - oldAvgPacketLoss;

    if (latencyChange < -20 && packetLossChange < -0.5) {
      setQualityTrend('improving');
    } else if (latencyChange > 50 || packetLossChange > 1) {
      setQualityTrend('degrading');
    } else {
      setQualityTrend('stable');
    }
  };

  const autoAdjustQuality = async (currentMetrics: CallQualityMetrics) => {
    const now = new Date();
    const adjustments: QualityAdjustment[] = [];

    // Check cooldown periods
    const canAdjustVideo = !adjustmentCooldownRef.current.video || 
      (now.getTime() - adjustmentCooldownRef.current.video.getTime()) > 30000; // 30 second cooldown

    const canAdjustAudio = !adjustmentCooldownRef.current.audio || 
      (now.getTime() - adjustmentCooldownRef.current.audio.getTime()) > 30000;

    // Video quality adjustments
    if (canAdjustVideo) {
      if (currentMetrics.packetLoss > 3 || currentMetrics.latency > 300) {
        if (currentMetrics.videoQuality !== 'low') {
          adjustments.push({
            type: 'video',
            action: 'downgrade',
            reason: `High packet loss (${currentMetrics.packetLoss.toFixed(1)}%) or latency (${currentMetrics.latency}ms)`,
            timestamp: now
          });
          adjustmentCooldownRef.current.video = now;
        }
      } else if (currentMetrics.packetLoss < 1 && currentMetrics.latency < 150 && currentMetrics.bandwidth.download > 1500) {
        if (currentMetrics.videoQuality !== 'high') {
          adjustments.push({
            type: 'video',
            action: 'upgrade',
            reason: 'Good connection quality detected',
            timestamp: now
          });
          adjustmentCooldownRef.current.video = now;
        }
      }
    }

    // Audio quality adjustments
    if (canAdjustAudio) {
      if (currentMetrics.packetLoss > 5 || currentMetrics.latency > 400) {
        if (currentMetrics.audioQuality !== 'low') {
          adjustments.push({
            type: 'audio',
            action: 'downgrade',
            reason: 'Poor connection affecting audio quality',
            timestamp: now
          });
          adjustmentCooldownRef.current.audio = now;
        }
      } else if (currentMetrics.packetLoss < 0.5 && currentMetrics.latency < 100) {
        if (currentMetrics.audioQuality !== 'high') {
          adjustments.push({
            type: 'audio',
            action: 'upgrade',
            reason: 'Excellent connection quality',
            timestamp: now
          });
          adjustmentCooldownRef.current.audio = now;
        }
      }
    }

    // Apply adjustments
    if (adjustments.length > 0) {
      setRecentAdjustments(prev => [...prev, ...adjustments].slice(-10)); // Keep last 10
      
      adjustments.forEach(adjustment => {
        if (onAdjustmentMade) {
          onAdjustmentMade(adjustment);
        }
      });

      // Update metrics with new quality settings
      setMetrics(prev => {
        const updated = { ...prev };
        adjustments.forEach(adj => {
          if (adj.type === 'video') {
            updated.videoQuality = adj.action === 'upgrade' ? 'high' : 'low';
          } else if (adj.type === 'audio') {
            updated.audioQuality = adj.action === 'upgrade' ? 'high' : 'low';
          }
        });
        return updated;
      });
    }
  };

  const getConnectionIcon = () => {
    switch (metrics.connectionStability) {
      case 'excellent':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'fair':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
      case 'excellent':
        return 'text-green-600';
      case 'medium':
      case 'good':
        return 'text-blue-600';
      case 'low':
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (qualityTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Quality Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-2"
      >
        <Button
          onClick={() => setShowQualityPanel(!showQualityPanel)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          {getConnectionIcon()}
          <span className="ml-2 text-xs">
            {metrics.connectionStability}
          </span>
        </Button>

        {/* Quality trend indicator */}
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
        </div>
      </motion.div>

      {/* Expanded Quality Panel */}
      <AnimatePresence>
        {showQualityPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-12 right-0 w-80"
          >
            <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Call Quality</h4>
                  <Badge variant={autoAdjustEnabled ? 'default' : 'secondary'}>
                    {autoAdjustEnabled ? 'Auto' : 'Manual'}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Latency</p>
                    <p className="font-medium">{metrics.latency}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Packet Loss</p>
                    <p className="font-medium">{metrics.packetLoss.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Video Quality</p>
                    <p className={`font-medium ${getQualityColor(metrics.videoQuality)}`}>
                      {metrics.videoQuality}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Audio Quality</p>
                    <p className={`font-medium ${getQualityColor(metrics.audioQuality)}`}>
                      {metrics.audioQuality}
                    </p>
                  </div>
                </div>

                {/* Bandwidth */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Bandwidth</p>
                  <div className="flex justify-between text-sm">
                    <span>↑ {metrics.bandwidth.upload.toFixed(0)} {metrics.bandwidth.unit}</span>
                    <span>↓ {metrics.bandwidth.download.toFixed(0)} {metrics.bandwidth.unit}</span>
                  </div>
                </div>

                {/* Recent Adjustments */}
                {recentAdjustments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Recent Adjustments</p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {recentAdjustments.slice(-3).map((adj, index) => (
                        <div key={index} className="text-xs p-2 bg-muted rounded">
                          <div className="flex items-center space-x-1">
                            {adj.type === 'video' ? <Camera className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            <span className="capitalize">{adj.type} {adj.action}</span>
                          </div>
                          <p className="text-muted-foreground mt-1">{adj.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex justify-between">
                  <Button
                    onClick={() => setAutoAdjustEnabled(!autoAdjustEnabled)}
                    variant="outline"
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {autoAdjustEnabled ? 'Disable Auto' : 'Enable Auto'}
                  </Button>
                  <Button
                    onClick={() => setShowQualityPanel(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
