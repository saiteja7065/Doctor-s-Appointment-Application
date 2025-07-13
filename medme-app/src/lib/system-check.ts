/**
 * Comprehensive System Check Utilities
 * Provides centralized system checking functionality for video consultations
 */

import { 
  checkSystemRequirements, 
  type SystemRequirements 
} from './browser-compatibility';
import { 
  performNetworkTest, 
  type NetworkTestResult 
} from './network-test';
import { 
  requestMediaPermissions, 
  type MediaTestResult 
} from './media-devices';

export interface SystemCheckResult {
  browser: SystemRequirements;
  network: NetworkTestResult;
  media: MediaTestResult;
  overallScore: number;
  passed: boolean;
  recommendations: string[];
  timestamp: string;
}

export interface SystemCheckOptions {
  skipNetworkTest?: boolean;
  skipMediaTest?: boolean;
  networkTimeout?: number;
  mediaTimeout?: number;
}

/**
 * Perform a comprehensive system check
 */
export async function performSystemCheck(
  options: SystemCheckOptions = {}
): Promise<SystemCheckResult> {
  const {
    skipNetworkTest = false,
    skipMediaTest = false,
    networkTimeout = 10000,
    mediaTimeout = 5000
  } = options;

  const timestamp = new Date().toISOString();
  
  // Browser compatibility check (always performed)
  const browserCheck = checkSystemRequirements();
  
  // Network test (optional)
  let networkCheck: NetworkTestResult;
  if (skipNetworkTest) {
    networkCheck = {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      quality: 'poor',
      recommendations: ['Network test was skipped'],
      warnings: []
    };
  } else {
    try {
      networkCheck = await Promise.race([
        performNetworkTest(),
        new Promise<NetworkTestResult>((_, reject) => 
          setTimeout(() => reject(new Error('Network test timeout')), networkTimeout)
        )
      ]);
    } catch (error) {
      console.warn('Network test failed:', error);
      networkCheck = {
        downloadSpeed: 0,
        uploadSpeed: 0,
        latency: 999,
        jitter: 999,
        packetLoss: 100,
        quality: 'poor',
        recommendations: ['Network test failed - check your internet connection'],
        warnings: ['Unable to test network speed']
      };
    }
  }
  
  // Media devices test (optional)
  let mediaCheck: MediaTestResult;
  if (skipMediaTest) {
    mediaCheck = {
      hasCamera: false,
      hasMicrophone: false,
      cameraPermission: 'unknown',
      microphonePermission: 'unknown',
      cameraDevices: [],
      microphoneDevices: [],
      errors: ['Media test was skipped'],
      warnings: [],
      recommendations: []
    };
  } else {
    try {
      mediaCheck = await Promise.race([
        requestMediaPermissions(true, true),
        new Promise<MediaTestResult>((_, reject) => 
          setTimeout(() => reject(new Error('Media test timeout')), mediaTimeout)
        )
      ]);
    } catch (error) {
      console.warn('Media test failed:', error);
      mediaCheck = {
        hasCamera: false,
        hasMicrophone: false,
        cameraPermission: 'denied',
        microphonePermission: 'denied',
        cameraDevices: [],
        microphoneDevices: [],
        errors: ['Media test failed - check device permissions'],
        warnings: ['Unable to access camera/microphone'],
        recommendations: ['Grant camera and microphone permissions']
      };
    }
  }

  // Calculate overall score
  const overallScore = calculateSystemScore(browserCheck, networkCheck, mediaCheck);
  
  // Determine if system passes minimum requirements
  const passed = determineSystemPass(browserCheck, networkCheck, mediaCheck, overallScore);
  
  // Generate recommendations
  const recommendations = generateSystemRecommendations(browserCheck, networkCheck, mediaCheck);

  return {
    browser: browserCheck,
    network: networkCheck,
    media: mediaCheck,
    overallScore,
    passed,
    recommendations,
    timestamp
  };
}

/**
 * Calculate overall system score (0-100)
 */
export function calculateSystemScore(
  browser: SystemRequirements,
  network: NetworkTestResult,
  media: MediaTestResult
): number {
  let score = 0;
  let maxScore = 0;

  // Browser score (30 points)
  maxScore += 30;
  switch (browser.overallSupport) {
    case 'excellent': score += 30; break;
    case 'good': score += 25; break;
    case 'limited': score += 15; break;
    case 'unsupported': score += 0; break;
  }

  // Network score (40 points)
  maxScore += 40;
  switch (network.quality) {
    case 'excellent': score += 40; break;
    case 'good': score += 30; break;
    case 'fair': score += 20; break;
    case 'poor': score += 5; break;
  }

  // Media score (30 points)
  maxScore += 30;
  if (media.hasCamera && media.hasMicrophone) {
    score += 30;
  } else if (media.hasCamera || media.hasMicrophone) {
    score += 15;
  }
  // Deduct points for errors
  score -= Math.min(media.errors.length * 5, 15);

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Determine if system meets minimum requirements
 */
export function determineSystemPass(
  browser: SystemRequirements,
  network: NetworkTestResult,
  media: MediaTestResult,
  overallScore: number
): boolean {
  // Critical requirements that must be met
  const criticalRequirements = [
    browser.overallSupport !== 'unsupported',
    browser.webRTC === true,
    browser.isSecureContext === true,
    network.quality !== 'poor' || network.downloadSpeed >= 1.0,
    media.hasCamera || media.hasMicrophone // At least one media device
  ];

  // Must meet all critical requirements AND have a reasonable overall score
  return criticalRequirements.every(req => req) && overallScore >= 60;
}

/**
 * Generate system-specific recommendations
 */
export function generateSystemRecommendations(
  browser: SystemRequirements,
  network: NetworkTestResult,
  media: MediaTestResult
): string[] {
  const recommendations: string[] = [];

  // Browser recommendations
  if (browser.overallSupport === 'unsupported') {
    recommendations.push('Update your browser or switch to a supported browser (Chrome, Firefox, Safari, Edge)');
  } else if (browser.overallSupport === 'limited') {
    recommendations.push('Update your browser to the latest version for optimal performance');
  }

  if (!browser.webRTC) {
    recommendations.push('Your browser does not support WebRTC - video calls will not work');
  }

  if (!browser.isSecureContext) {
    recommendations.push('Access the application via HTTPS for security and full functionality');
  }

  // Network recommendations
  if (network.quality === 'poor') {
    recommendations.push('Improve your internet connection - minimum 1 Mbps upload/download required');
  } else if (network.quality === 'fair') {
    recommendations.push('Consider improving your internet connection for better video quality');
  }

  if (network.downloadSpeed < 3.0 || network.uploadSpeed < 3.0) {
    recommendations.push('For best video quality, we recommend at least 3 Mbps upload and download speeds');
  }

  if (network.latency > 150) {
    recommendations.push('High network latency detected - you may experience delays during video calls');
  }

  // Media recommendations
  if (!media.hasCamera && !media.hasMicrophone) {
    recommendations.push('Grant camera and microphone permissions to participate in video consultations');
  } else if (!media.hasCamera) {
    recommendations.push('Grant camera permission for video consultations');
  } else if (!media.hasMicrophone) {
    recommendations.push('Grant microphone permission for audio during consultations');
  }

  if (media.errors.length > 0) {
    recommendations.push('Resolve camera/microphone issues before joining video consultations');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Your system is ready for high-quality video consultations!');
  } else {
    recommendations.push('Close other applications that might use your camera, microphone, or internet bandwidth');
  }

  return recommendations;
}

/**
 * Get system check status badge info
 */
export function getSystemCheckBadge(score: number, passed: boolean): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  text: string;
  color: string;
} {
  if (!passed) {
    return {
      variant: 'destructive',
      text: 'System Check Failed',
      color: 'text-red-600'
    };
  }

  if (score >= 90) {
    return {
      variant: 'default',
      text: 'Excellent',
      color: 'text-green-600'
    };
  } else if (score >= 75) {
    return {
      variant: 'default',
      text: 'Good',
      color: 'text-green-600'
    };
  } else if (score >= 60) {
    return {
      variant: 'secondary',
      text: 'Fair',
      color: 'text-yellow-600'
    };
  } else {
    return {
      variant: 'destructive',
      text: 'Poor',
      color: 'text-red-600'
    };
  }
}

/**
 * Quick system check for basic requirements
 */
export function quickSystemCheck(): {
  hasWebRTC: boolean;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  browserSupported: boolean;
} {
  const browser = checkSystemRequirements();
  
  return {
    hasWebRTC: browser.webRTC,
    isSecureContext: browser.isSecureContext,
    hasMediaDevices: browser.mediaDevices,
    browserSupported: browser.overallSupport !== 'unsupported'
  };
}
