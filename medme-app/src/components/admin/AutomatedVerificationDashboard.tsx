'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Zap,
  FileCheck,
  Users,
  TrendingUp,
  Settings,
  Play,
  RefreshCw,
  Download
} from 'lucide-react';

interface VerificationResult {
  applicationId: string;
  applicantName: string;
  passed: boolean;
  score: number;
  checks: VerificationCheck[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  timestamp?: string;
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  score: number;
  details: string;
  category: 'documents' | 'credentials' | 'experience' | 'education' | 'background';
}

interface VerificationStats {
  totalApplications: number;
  pendingVerification: number;
  autoApproved: number;
  autoRejected: number;
  manualReviewRequired: number;
  averageScore: number;
}

export default function AutomatedVerificationDashboard() {
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVerificationData();
  }, []);

  const loadVerificationData = async () => {
    try {
      // Load verification statistics
      const statsResponse = await fetch('/api/admin/doctors/verification-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Load recent verification results
      const resultsResponse = await fetch('/api/admin/doctors/verification-results');
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setVerificationResults(resultsData.data || []);
      }
    } catch (error) {
      console.error('Error loading verification data:', error);
      // Set demo data
      setStats({
        totalApplications: 45,
        pendingVerification: 12,
        autoApproved: 28,
        autoRejected: 3,
        manualReviewRequired: 2,
        averageScore: 78.5
      });
      setVerificationResults([
        {
          applicationId: 'demo_1',
          applicantName: 'Dr. Sarah Johnson',
          passed: true,
          score: 92,
          checks: [
            {
              name: 'Document Verification',
              passed: true,
              score: 100,
              details: 'All required documents uploaded',
              category: 'documents'
            },
            {
              name: 'License Validation',
              passed: true,
              score: 95,
              details: 'License number format valid',
              category: 'credentials'
            }
          ],
          recommendations: ['Application ready for approval'],
          riskLevel: 'low',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const runBulkVerification = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/admin/doctors/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runAll: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationResults(data.results || []);
        await loadVerificationData(); // Refresh stats
      }
    } catch (error) {
      console.error('Error running bulk verification:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleVerification = async (applicationId: string) => {
    try {
      const response = await fetch('/api/admin/doctors/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the specific result
        setVerificationResults(prev => 
          prev.map(result => 
            result.applicationId === applicationId 
              ? { ...data.results, applicationId, applicantName: data.applicantName }
              : result
          )
        );
      }
    } catch (error) {
      console.error('Error running verification:', error);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportResults = () => {
    const csvContent = [
      ['Application ID', 'Applicant Name', 'Score', 'Passed', 'Risk Level', 'Timestamp'],
      ...verificationResults.map(result => [
        result.applicationId,
        result.applicantName,
        result.score.toString(),
        result.passed ? 'Yes' : 'No',
        result.riskLevel,
        result.timestamp || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Automated Verification</h2>
          <p className="text-muted-foreground">
            AI-powered verification system for doctor applications
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={runBulkVerification}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isRunning ? 'Running...' : 'Run Bulk Verification'}</span>
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Applications
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {stats.totalApplications}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Pending Verification
                    </p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {stats.pendingVerification}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Auto Approved
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.autoApproved}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Average Score
                    </p>
                    <p className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
                      {stats.averageScore.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Verification Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Verification Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Recent Verification Results</span>
                </CardTitle>
                <CardDescription>
                  Automated verification results for doctor applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationResults.length > 0 ? (
                  <div className="space-y-4">
                    {verificationResults.map((result) => (
                      <div
                        key={result.applicationId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedResult(result)}
                      >
                        <div className="flex items-center space-x-3">
                          {result.passed ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {result.applicantName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {result.applicationId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className={`font-medium ${getScoreColor(result.score)}`}>
                              {result.score}%
                            </p>
                            <Badge className={getRiskLevelColor(result.riskLevel)}>
                              {result.riskLevel} risk
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              runSingleVerification(result.applicationId);
                            }}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No verification results yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Run automated verification to see results here
                    </p>
                    <Button onClick={runBulkVerification} disabled={isRunning}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
