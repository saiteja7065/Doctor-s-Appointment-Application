'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Eye, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  Globe,
  Server,
  Database,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SecurityStatus {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotation: Date;
    status: 'healthy' | 'warning' | 'critical';
  };
  authentication: {
    mfaEnabled: boolean;
    sessionTimeout: number;
    failedAttempts: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  authorization: {
    rbacEnabled: boolean;
    activeRoles: number;
    permissionChecks: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  monitoring: {
    auditLogging: boolean;
    realTimeAlerts: boolean;
    threatDetection: boolean;
    status: 'healthy' | 'warning' | 'critical';
  };
  network: {
    httpsOnly: boolean;
    securityHeaders: boolean;
    rateLimiting: boolean;
    status: 'healthy' | 'warning' | 'critical';
  };
  database: {
    encrypted: boolean;
    backupEncrypted: boolean;
    accessLogged: boolean;
    status: 'healthy' | 'warning' | 'critical';
  };
}

interface ThreatIndicator {
  id: string;
  type: 'brute_force' | 'data_exfiltration' | 'privilege_escalation' | 'suspicious_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: Date;
  mitigated: boolean;
}

export default function SecurityMonitor() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [threatIndicators, setThreatIndicators] = useState<ThreatIndicator[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchSecurityStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityStatus, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSecurityStatus = async () => {
    try {
      // In a real implementation, this would fetch from security monitoring APIs
      const mockStatus: SecurityStatus = {
        encryption: {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyRotation: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          status: 'healthy'
        },
        authentication: {
          mfaEnabled: true,
          sessionTimeout: 3600, // 1 hour
          failedAttempts: 3,
          status: 'healthy'
        },
        authorization: {
          rbacEnabled: true,
          activeRoles: 3, // admin, doctor, patient
          permissionChecks: 1247,
          status: 'healthy'
        },
        monitoring: {
          auditLogging: true,
          realTimeAlerts: true,
          threatDetection: true,
          status: 'healthy'
        },
        network: {
          httpsOnly: true,
          securityHeaders: true,
          rateLimiting: true,
          status: 'healthy'
        },
        database: {
          encrypted: true,
          backupEncrypted: true,
          accessLogged: true,
          status: 'healthy'
        }
      };

      const mockThreats: ThreatIndicator[] = [
        {
          id: '1',
          type: 'brute_force',
          severity: 'medium',
          description: 'Multiple failed login attempts detected from IP 203.0.113.45',
          source: '203.0.113.45',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          mitigated: false
        },
        {
          id: '2',
          type: 'suspicious_access',
          severity: 'low',
          description: 'Unusual access pattern detected for user account',
          source: 'user_analytics',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          mitigated: true
        }
      ];

      setSecurityStatus(mockStatus);
      setThreatIndicators(mockThreats);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Failed to fetch security status:', error);
      toast.error('Failed to update security status');
    }
  };

  const handleMitigateThreat = async (threatId: string) => {
    try {
      // In a real implementation, this would call a mitigation API
      setThreatIndicators(prev => 
        prev.map(threat => 
          threat.id === threatId 
            ? { ...threat, mitigated: true }
            : threat
        )
      );
      toast.success('Threat mitigation initiated');
    } catch (error) {
      console.error('Failed to mitigate threat:', error);
      toast.error('Failed to mitigate threat');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  if (!securityStatus) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Monitor</h2>
          <p className="text-gray-600 mt-1">
            Real-time security status and threat detection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>

      {/* Security Status Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* Encryption Status */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.encryption.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4" />
              Data Encryption
              {getStatusIcon(securityStatus.encryption.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>Algorithm: {securityStatus.encryption.algorithm}</div>
              <div>Key Rotation: {securityStatus.encryption.keyRotation.toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Status */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.authentication.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4" />
              Authentication
              {getStatusIcon(securityStatus.authentication.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>MFA: {securityStatus.authentication.mfaEnabled ? 'Enabled' : 'Disabled'}</div>
              <div>Session Timeout: {securityStatus.authentication.sessionTimeout}s</div>
            </div>
          </CardContent>
        </Card>

        {/* Authorization Status */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.authorization.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Authorization
              {getStatusIcon(securityStatus.authorization.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>RBAC: {securityStatus.authorization.rbacEnabled ? 'Enabled' : 'Disabled'}</div>
              <div>Active Roles: {securityStatus.authorization.activeRoles}</div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Status */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.monitoring.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              Monitoring
              {getStatusIcon(securityStatus.monitoring.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>Audit Logging: {securityStatus.monitoring.auditLogging ? 'Active' : 'Inactive'}</div>
              <div>Real-time Alerts: {securityStatus.monitoring.realTimeAlerts ? 'Active' : 'Inactive'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Network Security */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.network.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              Network Security
              {getStatusIcon(securityStatus.network.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>HTTPS Only: {securityStatus.network.httpsOnly ? 'Enforced' : 'Not Enforced'}</div>
              <div>Rate Limiting: {securityStatus.network.rateLimiting ? 'Active' : 'Inactive'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Database Security */}
        <Card className={`glass-card border ${getStatusColor(securityStatus.database.status)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Database Security
              {getStatusIcon(securityStatus.database.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-gray-600">
              <div>Encryption: {securityStatus.database.encrypted ? 'Enabled' : 'Disabled'}</div>
              <div>Access Logging: {securityStatus.database.accessLogged ? 'Active' : 'Inactive'}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Threat Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Active Threat Indicators
              {threatIndicators.filter(t => !t.mitigated).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {threatIndicators.filter(t => !t.mitigated).length} Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {threatIndicators.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No active threats detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {threatIndicators.map((threat) => (
                    <motion.div
                      key={threat.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-lg border ${getSeverityColor(threat.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {threat.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge variant={threat.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {threat.severity.toUpperCase()}
                            </Badge>
                            {threat.mitigated && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                MITIGATED
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">{threat.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Source: {threat.source}</span>
                            <span>Time: {threat.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {!threat.mitigated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMitigateThreat(threat.id)}
                            className="ml-4"
                          >
                            Mitigate
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
