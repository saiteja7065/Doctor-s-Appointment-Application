'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TechnicalPrerequisites from '@/components/consultation/TechnicalPrerequisites';
import { 
  Monitor, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Stethoscope,
  Video,
  Wifi,
  Camera,
  Mic
} from 'lucide-react';
import Link from 'next/link';

export default function TechnicalPrerequisitesTestPage() {
  const [showTest, setShowTest] = useState(false);
  const [testResults, setTestResults] = useState<boolean | null>(null);

  const handleTestComplete = (allPassed: boolean) => {
    setTestResults(allPassed);
    console.log('Technical prerequisites test completed:', allPassed ? 'PASSED' : 'FAILED');
  };

  const resetTest = () => {
    setShowTest(false);
    setTestResults(null);
  };

  if (showTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={resetTest}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">VC-PREREQ-001: Technical Prerequisites Test</h1>
                  <p className="text-muted-foreground">Enhanced system compatibility and performance check</p>
                </div>
              </div>
              <Badge variant="secondary">Live Test</Badge>
            </div>
          </div>

          {/* Test Results */}
          {testResults !== null && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  {testResults ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-700">System Ready for Video Consultation</h3>
                        <p className="text-sm text-muted-foreground">All technical prerequisites have been met</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-700">Issues Detected</h3>
                        <p className="text-sm text-muted-foreground">Some technical requirements need attention</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Prerequisites Component */}
          <TechnicalPrerequisites
            onComplete={handleTestComplete}
            autoStart={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Stethoscope className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Technical Prerequisites Test</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            VC-PREREQ-001: Enhanced System Compatibility Check
          </p>
        </div>

        {/* Feature Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-teal-600" />
              <span>Enhanced Technical Prerequisites System</span>
            </CardTitle>
            <CardDescription>
              Comprehensive system check to ensure optimal video consultation experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-teal-600 mb-3">Enhanced Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span>Advanced browser compatibility detection with version checking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span>Detailed internet speed testing with upload/download metrics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Camera className="h-4 w-4 text-purple-500" />
                    <span>Enhanced camera quality assessment and device detection</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Mic className="h-4 w-4 text-orange-500" />
                    <span>Advanced microphone testing with audio level detection</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-teal-600 mb-3">Technical Improvements</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Browser version requirements (Chrome 72+, Firefox 68+, Safari 12.1+, Edge 79+)</li>
                  <li>• Real-time connection speed measurement with quality indicators</li>
                  <li>• Camera resolution and frame rate optimization detection</li>
                  <li>• Microphone noise cancellation and quality assessment</li>
                  <li>• Comprehensive error handling with specific guidance</li>
                  <li>• Warning system for suboptimal but functional configurations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <div className="text-center">
          <Button 
            onClick={() => setShowTest(true)}
            size="lg"
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Video className="h-5 w-5 mr-2" />
            Start Technical Prerequisites Test
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will test your browser, internet connection, camera, and microphone
          </p>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link href="/test">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Test Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
