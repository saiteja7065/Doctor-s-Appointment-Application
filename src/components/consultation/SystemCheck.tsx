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
  Info
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

interface SystemCheckProps {
  onComplete?: (passed: boolean) => void;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

interface CheckStatus {
  browser: 'pending' | 'running' | 'passed' | 'failed';
  network: 'pending' | 'running' | 'passed' | 'failed';
  media: 'pending' | 'running' | 'passed' | 'failed';
}

export default function SystemCheck({ onComplete, onRetry, showRetryButton = true }: SystemCheckProps) {
  const [status, setStatus] = useState<CheckStatus>({
    browser: 'pending',
    network: 'pending',
    media: 'pending'
  });
  
  const [systemReqs, setSystemReqs] = useState<SystemRequirements | null>(null);
  const [networkResult, setNetworkResult] = useState<NetworkTestResult | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    runSystemCheck();
    return () => {
      // Cleanup media stream if it exists
      if (mediaResult?.testStream) {
        stopMediaStream(mediaResult.testStream);
      }
    };
  }, []);

  const runSystemCheck = async () => {
    setIsRunning(true);
    setProgress(0);
    
    // Reset status
    setStatus({
      browser: 'pending',
      network: 'pending',
      media: 'pending'
    });

    try {
      // Step 1: Browser compatibility check
      setStatus(prev => ({ ...prev, browser: 'running' }));
      setProgress(10);
      
      const browserCheck = checkSystemRequirements();
      setSystemReqs(browserCheck);
      setStatus(prev => ({ 
        ...prev, 
        browser: browserCheck.overallSupport === 'unsupported' ? 'failed' : 'passed' 
      }));
      setProgress(33);

      // Step 2: Network speed test
      setStatus(prev => ({ ...prev, network: 'running' }));
      
      const networkCheck = await performNetworkTest();
      setNetworkResult(networkCheck);
      setStatus(prev => ({ 
        ...prev, 
        network: networkCheck.quality === 'poor' ? 'failed' : 'passed' 
      }));
      setProgress(66);

      // Step 3: Media devices test
      setStatus(prev => ({ ...prev, media: 'running' }));
      
      const mediaCheck = await requestMediaPermissions(true, true);
      setMediaResult(mediaCheck);
      setStatus(prev => ({ 
        ...prev, 
        media: mediaCheck.errors.length > 0 ? 'failed' : 'passed' 
      }));
      setProgress(100);

      // Determine overall result
      const allPassed = browserCheck.overallSupport !== 'unsupported' &&
                       networkCheck.quality !== 'poor' &&
                       mediaCheck.errors.length === 0;

      if (onComplete) {
        onComplete(allPassed);
      }

    } catch (error) {
      console.error('System check failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (checkStatus: CheckStatus[keyof CheckStatus]) => {
    switch (checkStatus) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Check</h2>
        <p className="text-gray-600">
          We're checking your system to ensure the best video consultation experience
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>System Check Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Check Results */}
      <div className="grid gap-4">
        {/* Browser Compatibility */}
        <Card className={`transition-colors ${getStatusColor(status.browser)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Monitor className="h-6 w-6 text-gray-600" />
                <div>
                  <CardTitle className="text-lg">Browser Compatibility</CardTitle>
                  <CardDescription>Checking browser version and WebRTC support</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.browser)}
            </div>
          </CardHeader>
          {systemReqs && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Browser:</span>
                  <Badge variant={systemReqs.browser.isSupported ? 'default' : 'destructive'}>
                    {getBrowserDisplayName(systemReqs.browser.name)} {systemReqs.browser.version}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Support Level:</span>
                  <Badge variant={systemReqs.overallSupport === 'excellent' ? 'default' : 'secondary'}>
                    {systemReqs.overallSupport}
                  </Badge>
                </div>
                {systemReqs.criticalIssues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600">Critical Issues:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {systemReqs.criticalIssues.map((issue, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {systemReqs.browser.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommendations:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {systemReqs.browser.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
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
                <Wifi className="h-6 w-6 text-gray-600" />
                <div>
                  <CardTitle className="text-lg">Network Speed</CardTitle>
                  <CardDescription>Testing internet connection quality</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.network)}
            </div>
          </CardHeader>
          {networkResult && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Download:</span>
                    <p className="text-lg font-semibold">{networkResult.downloadSpeed.toFixed(1)} Mbps</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Upload:</span>
                    <p className="text-lg font-semibold">{networkResult.uploadSpeed.toFixed(1)} Mbps</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality:</span>
                  <Badge className={getNetworkQualityColor(networkResult.quality)}>
                    {getNetworkQualityIcon(networkResult.quality)} {networkResult.quality}
                  </Badge>
                </div>
                {networkResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-600">Warnings:</h4>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {networkResult.warnings.map((warning, index) => (
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
                  <CardDescription>Testing media device access</CardDescription>
                </div>
              </div>
              {getStatusIcon(status.media)}
            </div>
          </CardHeader>
          {mediaResult && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Camera:</span>
                    <Badge variant={mediaResult.hasCamera ? 'default' : 'destructive'}>
                      {mediaResult.hasCamera ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Microphone:</span>
                    <Badge variant={mediaResult.hasMicrophone ? 'default' : 'destructive'}>
                      {mediaResult.hasMicrophone ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                </div>
                {mediaResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600">Issues:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {mediaResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {mediaResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommendations:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {mediaResult.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
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

      {/* Action Buttons */}
      {!isRunning && showRetryButton && (
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={runSystemCheck}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Run Check Again</span>
          </Button>
          {onRetry && (
            <Button onClick={onRetry}>
              Continue Anyway
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
