'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Lock, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Users,
  Database,
  Key,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface SecurityMetrics {
  overallScore: number;
  authenticationHealth: number;
  dataProtection: number;
  accessControl: number;
  auditCompliance: number;
  threatDetection: number;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'failed_login' | 'data_access' | 'permission_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
}

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_breach' | 'suspicious_activity';
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    overallScore: 0,
    authenticationHealth: 0,
    dataProtection: 0,
    accessControl: 0,
    auditCompliance: 0,
    threatDetection: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // In a real implementation, these would be separate API calls
      const [metricsResponse, eventsResponse, alertsResponse] = await Promise.all([
        fetch('/api/security/metrics'),
        fetch('/api/security/events'),
        fetch('/api/security/alerts')
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      } else {
        // Demo data fallback
        setMetrics({
          overallScore: 87,
          authenticationHealth: 92,
          dataProtection: 89,
          accessControl: 85,
          auditCompliance: 91,
          threatDetection: 83
        });
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setRecentEvents(eventsData);
      } else {
        // Demo data fallback
        setRecentEvents([
          {
            id: '1',
            type: 'login',
            severity: 'low',
            description: 'User login successful',
            userId: 'user_123',
            userName: 'Dr. Sarah Johnson',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            ipAddress: '192.168.1.100',
            resolved: true
          },
          {
            id: '2',
            type: 'failed_login',
            severity: 'medium',
            description: 'Multiple failed login attempts',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            ipAddress: '203.0.113.45',
            resolved: false
          },
          {
            id: '3',
            type: 'data_access',
            severity: 'low',
            description: 'Admin accessed patient records',
            userId: 'admin_456',
            userName: 'Admin User',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            resolved: true
          }
        ]);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setActiveAlerts(alertsData);
      } else {
        // Demo data fallback
        setActiveAlerts([
          {
            id: '1',
            title: 'Unusual Login Pattern Detected',
            description: 'Multiple login attempts from different geographic locations',
            severity: 'medium',
            category: 'authentication',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            acknowledged: false
          },
          {
            id: '2',
            title: 'High Volume Data Access',
            description: 'User accessed unusually high number of patient records',
            severity: 'high',
            category: 'data_breach',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            acknowledged: true
          }
        ]);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/security/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        setActiveAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, acknowledged: true }
              : alert
          )
        );
        toast.success('Alert acknowledged');
      } else {
        throw new Error('Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/security/alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (response.ok) {
        setActiveAlerts(prev => 
          prev.filter(alert => alert.id !== alertId)
        );
        toast.success('Alert resolved');
      } else {
        throw new Error('Failed to resolve alert');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((timestamp.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor security metrics, events, and threats in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSecurityData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Security Score Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.overallScore)}`}>
                  {metrics.overallScore}%
                </p>
              </div>
              <Shield className={`h-8 w-8 ${getScoreColor(metrics.overallScore)}`} />
            </div>
            <Progress value={metrics.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Authentication</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.authenticationHealth)}`}>
                  {metrics.authenticationHealth}%
                </p>
              </div>
              <Key className={`h-8 w-8 ${getScoreColor(metrics.authenticationHealth)}`} />
            </div>
            <Progress value={metrics.authenticationHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Protection</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.dataProtection)}`}>
                  {metrics.dataProtection}%
                </p>
              </div>
              <Database className={`h-8 w-8 ${getScoreColor(metrics.dataProtection)}`} />
            </div>
            <Progress value={metrics.dataProtection} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Access Control</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.accessControl)}`}>
                  {metrics.accessControl}%
                </p>
              </div>
              <Lock className={`h-8 w-8 ${getScoreColor(metrics.accessControl)}`} />
            </div>
            <Progress value={metrics.accessControl} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Audit Compliance</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.auditCompliance)}`}>
                  {metrics.auditCompliance}%
                </p>
              </div>
              <FileText className={`h-8 w-8 ${getScoreColor(metrics.auditCompliance)}`} />
            </div>
            <Progress value={metrics.auditCompliance} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Threat Detection</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.threatDetection)}`}>
                  {metrics.threatDetection}%
                </p>
              </div>
              <Eye className={`h-8 w-8 ${getScoreColor(metrics.threatDetection)}`} />
            </div>
            <Progress value={metrics.threatDetection} className="mt-2" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Security Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Security Alerts
              {activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {activeAlerts.filter(alert => !alert.acknowledged).length} New
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No active security alerts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {!alert.acknowledged && (
                            <Badge variant="outline">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Category: {alert.category}</span>
                          <span>Time: {formatTimestamp(alert.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Events and Audit Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              Security Events & Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="events" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="events">Recent Events</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="space-y-4">
                {recentEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent security events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            event.severity === 'critical' ? 'bg-red-500' :
                            event.severity === 'high' ? 'bg-orange-500' :
                            event.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{event.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {event.userName && <span>User: {event.userName}</span>}
                              {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                              <span>Time: {formatTimestamp(event.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeVariant(event.severity)}>
                            {event.severity}
                          </Badge>
                          {event.resolved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit" className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Detailed audit logs available in admin panel</p>
                  <Button variant="outline" className="mt-4">
                    View Full Audit Trail
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
