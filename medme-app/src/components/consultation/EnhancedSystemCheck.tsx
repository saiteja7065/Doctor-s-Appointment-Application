'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Monitor, 
  Wifi, 
  Camera, 
  Mic,
  RefreshCw,
  ExternalLink,
  Info,
  Shield,
  Zap,
  Settings
} from 'lucide-react';
import { 
  checkSystemRequirements, 
  getBrowserDisplayName, 
  getRecommendedBrowsers,
  type SystemRequirements 
} from '@/lib/browser-compatibility';
import { 
  performNetworkTest, 
  getNetworkQualityColor, 
  getNetworkQualityIcon,
  type NetworkTestResult 
} from '@/lib/network-test';
import { 
  requestMediaPermissions, 
  stopMediaStream, 
  getMediaTroubleshootingTips,
  type MediaTestResult 
} from '@/lib/media-devices';

interface EnhancedSystemCheckProps {
  onComplete?: (passed: boolean, results: SystemCheckResults) => void;
  onRetry?: () => void;
  showRetryButton?: boolean;
  autoStart?: boolean;
}

interface SystemCheckResults {
  browser: SystemRequirements;
  network: NetworkTestResult;
  media: MediaTestResult;
  overallScore: number;
  passed: boolean;
  recommendations: string[];
}

interface CheckStatus {
  browser: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  network: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  media: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  security: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
}

export default function EnhancedSystemCheck({ 
  onComplete, 
  onRetry, 
  showRetryButton = true,
  autoStart = true 
}: EnhancedSystemCheckProps) {
  const [status, setStatus] = useState<CheckStatus>({
    browser: 'pending',
    network: 'pending',
    media: 'pending',
    security: 'pending'
  });
  
  const [results, setResults] = useState<Partial<SystemCheckResults>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (autoStart) {
      runSystemCheck();
    }
    return () => {
      // Cleanup media stream if it exists
      if (results.media?.testStream) {
        stopMediaStream(results.media.testStream);
      }
    };
  }, [autoStart]);

  const runSystemCheck = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('Initializing system check...');
    
    // Reset status
    setStatus({
      browser: 'pending',
      network: 'pending',
      media: 'pending',
      security: 'pending'
    });

    const checkResults: Partial<SystemCheckResults> = {};

    try {
      // Step 1: Security and Browser compatibility check
      setCurrentStep('Checking browser compatibility and security...');
      setStatus(prev => ({ ...prev, browser: 'running', security: 'running' }));
      setProgress(10);
      
      const browserCheck = checkSystemRequirements();
      checkResults.browser = browserCheck;
      
      // Security checks
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
      
      setStatus(prev => ({ 
        ...prev, 
        browser: browserCheck.overallSupport === 'unsupported' ? 'failed' : 
                browserCheck.overallSupport === 'limited' ? 'warning' : 'passed',
        security: isSecure && hasWebRTC ? 'passed' : 'warning'
      }));
      setProgress(25);

      // Step 2: Network speed test
      setCurrentStep('Testing network connection speed...');
      setStatus(prev => ({ ...prev, network: 'running' }));
      
      const networkCheck = await performNetworkTest();
      checkResults.network = networkCheck;
      setStatus(prev => ({ 
        ...prev, 
        network: networkCheck.quality === 'poor' ? 'failed' : 
                networkCheck.quality === 'fair' ? 'warning' : 'passed'
      }));
      setProgress(50);

      // Step 3: Media devices test
      setCurrentStep('Testing camera and microphone access...');
      setStatus(prev => ({ ...prev, media: 'running' }));
      
      const mediaCheck = await requestMediaPermissions(true, true);
      checkResults.media = mediaCheck;
      setStatus(prev => ({ 
        ...prev, 
        media: mediaCheck.errors.length > 0 ? 'failed' : 
               mediaCheck.warnings.length > 0 ? 'warning' : 'passed'
      }));
      setProgress(75);

      // Step 4: Calculate overall score and recommendations
      setCurrentStep('Analyzing results...');
      setProgress(90);

      const overallScore = calculateOverallScore(checkResults);
      const passed = overallScore >= 70; // 70% threshold for passing
      const recommendations = generateRecommendations(checkResults);

      const finalResults: SystemCheckResults = {
        browser: checkResults.browser!,
        network: checkResults.network!,
        media: checkResults.media!,
        overallScore,
        passed,
        recommendations
      };

      setResults(finalResults);
      setProgress(100);
      setCurrentStep('System check completed');

      // Log results to API for analytics
      try {
        await fetch('/api/system-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            browserInfo: checkResults.browser,
            networkResults: checkResults.network,
            deviceResults: checkResults.media,
            overallResult: { score: overallScore, passed },
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.warn('Failed to log system check results:', error);
      }

      if (onComplete) {
        onComplete(passed, finalResults);
      }

    } catch (error) {
      console.error('System check failed:', error);
      setCurrentStep('System check failed');
    } finally {
      setIsRunning(false);
    }
  };

  const calculateOverallScore = (results: Partial<SystemCheckResults>): number => {
    let score = 0;
    let maxScore = 0;

    // Browser score (30 points)
    if (results.browser) {
      maxScore += 30;
      switch (results.browser.overallSupport) {
        case 'excellent': score += 30; break;
        case 'good': score += 25; break;
        case 'limited': score += 15; break;
        case 'unsupported': score += 0; break;
      }
    }

    // Network score (40 points)
    if (results.network) {
      maxScore += 40;
      switch (results.network.quality) {
        case 'excellent': score += 40; break;
        case 'good': score += 30; break;
        case 'fair': score += 20; break;
        case 'poor': score += 5; break;
      }
    }

    // Media score (30 points)
    if (results.media) {
      maxScore += 30;
      if (results.media.hasCamera && results.media.hasMicrophone) {
        score += 30;
      } else if (results.media.hasCamera || results.media.hasMicrophone) {
        score += 15;
      }
      // Deduct points for errors
      score -= Math.min(results.media.errors.length * 5, 15);
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  const generateRecommendations = (results: Partial<SystemCheckResults>): string[] => {
    const recommendations: string[] = [];

    if (results.browser?.overallSupport === 'limited' || results.browser?.overallSupport === 'unsupported') {
      recommendations.push('Update your browser to the latest version for optimal performance');
    }

    if (results.network?.quality === 'poor' || results.network?.quality === 'fair') {
      recommendations.push('Improve your internet connection for better video quality');
    }

    if (results.media?.errors.length > 0) {
      recommendations.push('Grant camera and microphone permissions for video consultations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your system is ready for high-quality video consultations!');
    }

    return recommendations;
  };

  const getStatusIcon = (checkStatus: CheckStatus[keyof CheckStatus]) => {
    switch (checkStatus) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (checkStatus: CheckStatus[keyof CheckStatus]) => {
    switch (checkStatus) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'passed':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced System Check</h2>
        <p className="text-gray-600">
          Comprehensive testing to ensure optimal video consultation experience
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{currentStep}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            {results.overallScore !== undefined && (
              <div className="text-center">
                <Badge 
                  variant={results.passed ? 'default' : 'destructive'}
                  className="text-sm px-3 py-1"
                >
                  Overall Score: {results.overallScore}%
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check Results */}
      <div className="grid gap-4">
        {/* Browser & Security */}
        <Card className={`transition-colors ${getStatusColor(status.browser)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <Monitor className="h-6 w-6 text-gray-600" />
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Browser & Security</CardTitle>
                  <CardDescription>Browser compatibility and security checks</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.browser)}
            </div>
          </CardHeader>
          {results.browser && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Browser:</span>
                    <Badge variant={results.browser.browser.isSupported ? 'default' : 'destructive'}>
                      {getBrowserDisplayName(results.browser.browser.name)} {results.browser.browser.version}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Support Level:</span>
                    <Badge variant={results.browser.overallSupport === 'excellent' ? 'default' : 'secondary'}>
                      {results.browser.overallSupport}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">WebRTC:</span>
                    <Badge variant={results.browser.webRTC ? 'default' : 'destructive'}>
                      {results.browser.webRTC ? 'Supported' : 'Not Supported'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Secure Context:</span>
                    <Badge variant={results.browser.isSecureContext ? 'default' : 'destructive'}>
                      {results.browser.isSecureContext ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                {results.browser.criticalIssues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600">Critical Issues:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {results.browser.criticalIssues.map((issue, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Network Speed */}
        <Card className={`transition-colors ${getStatusColor(status.network)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <Wifi className="h-6 w-6 text-gray-600" />
                  <Zap className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Network Performance</CardTitle>
                  <CardDescription>Internet speed and connection quality</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.network)}
            </div>
          </CardHeader>
          {results.network && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium">Download:</span>
                    <p className="text-lg font-semibold">{results.network.downloadSpeed.toFixed(1)} Mbps</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Upload:</span>
                    <p className="text-lg font-semibold">{results.network.uploadSpeed.toFixed(1)} Mbps</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Latency:</span>
                    <p className="text-lg font-semibold">{results.network.latency.toFixed(0)} ms</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality:</span>
                  <Badge className={getNetworkQualityColor(results.network.quality)}>
                    {getNetworkQualityIcon(results.network.quality)} {results.network.quality}
                  </Badge>
                </div>
                {results.network.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-600">Network Warnings:</h4>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {results.network.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Media Devices */}
        <Card className={`transition-colors ${getStatusColor(status.media)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <Camera className="h-6 w-6 text-gray-600" />
                  <Mic className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Camera & Microphone</CardTitle>
                  <CardDescription>Media device access and permissions</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.media)}
            </div>
          </CardHeader>
          {results.media && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Camera:</span>
                    <Badge variant={results.media.hasCamera ? 'default' : 'destructive'}>
                      {results.media.hasCamera ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Microphone:</span>
                    <Badge variant={results.media.hasMicrophone ? 'default' : 'destructive'}>
                      {results.media.hasMicrophone ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Camera Devices:</span>
                    <span className="text-sm text-muted-foreground">{results.media.cameraDevices.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audio Devices:</span>
                    <span className="text-sm text-muted-foreground">{results.media.microphoneDevices.length}</span>
                  </div>
                </div>
                {results.media.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600">Device Issues:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {results.media.errors.map((error, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Recommendations */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-500" />
              <span>Recommendations</span>
            </CardTitle>
            <CardDescription>
              Suggestions to improve your video consultation experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {!isRunning && showRetryButton && (
          <Button
            variant="outline"
            onClick={runSystemCheck}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Run Check Again</span>
          </Button>
        )}

        {!isRunning && (
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>{showDetails ? 'Hide' : 'Show'} Details</span>
          </Button>
        )}

        {onRetry && !isRunning && (
          <Button onClick={onRetry}>
            Continue to Consultation
          </Button>
        )}
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>System Requirements</CardTitle>
              <CardDescription>
                Detailed requirements for optimal video consultation experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Supported Browsers:</h4>
                  <ul className="space-y-2 text-sm">
                    {getRecommendedBrowsers().map((browser, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span>{browser.name}</span>
                        <span className="text-muted-foreground">{browser.version}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Network Requirements:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span>Minimum Download:</span>
                      <span className="text-muted-foreground">1.0 Mbps</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Minimum Upload:</span>
                      <span className="text-muted-foreground">1.0 Mbps</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Recommended:</span>
                      <span className="text-muted-foreground">3.0+ Mbps</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Max Latency:</span>
                      <span className="text-muted-foreground">150ms</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Tips</CardTitle>
              <CardDescription>
                Common solutions for system check issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Browser Issues:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Update to latest browser version</li>
                    <li>• Enable JavaScript and cookies</li>
                    <li>• Disable interfering extensions</li>
                    <li>• Clear cache and cookies</li>
                    <li>• Try incognito/private mode</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Network Issues:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Close bandwidth-heavy apps</li>
                    <li>• Move closer to WiFi router</li>
                    <li>• Use wired connection</li>
                    <li>• Restart router/modem</li>
                    <li>• Contact ISP if persistent</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Device Issues:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Allow camera/mic permissions</li>
                    <li>• Check device privacy settings</li>
                    <li>• Close other apps using devices</li>
                    <li>• Restart browser</li>
                    <li>• Try different devices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
