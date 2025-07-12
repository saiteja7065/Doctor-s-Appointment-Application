/**
 * Browser Compatibility Detection for Video Consultations
 * Ensures users meet technical requirements for optimal video call performance
 */

export interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
  supportLevel: 'excellent' | 'good' | 'limited' | 'unsupported';
  warnings: string[];
  recommendations: string[];
}

export interface SystemRequirements {
  browser: BrowserInfo;
  webRTC: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
  isSecureContext: boolean;
  overallSupport: 'excellent' | 'good' | 'limited' | 'unsupported';
  criticalIssues: string[];
  warnings: string[];
}

// Minimum supported browser versions based on Vonage requirements
const MINIMUM_VERSIONS = {
  chrome: 72,
  firefox: 68,
  safari: 12.1,
  edge: 79, // Chromium-based Edge
  opera: 60
};

/**
 * Detect browser name and version
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name = 'unknown';
  let version = 0;
  let isSupported = false;
  let supportLevel: BrowserInfo['supportLevel'] = 'unsupported';
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Chrome detection (must come before Safari due to user agent string)
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
  }
  // Edge detection (Chromium-based)
  else if (userAgent.includes('Edg')) {
    name = 'edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
  }
  // Firefox detection
  else if (userAgent.includes('Firefox')) {
    name = 'firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
  }
  // Safari detection
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'safari';
    const match = userAgent.match(/Version\/(\d+(?:\.\d+)?)/);
    version = match ? parseFloat(match[1]) : 0;
  }
  // Opera detection
  else if (userAgent.includes('OPR')) {
    name = 'opera';
    const match = userAgent.match(/OPR\/(\d+)/);
    version = match ? parseInt(match[1]) : 0;
  }

  // Check if browser meets minimum requirements
  const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
  if (minVersion && version >= minVersion) {
    isSupported = true;
    
    // Determine support level
    if (name === 'chrome' && version >= 90) {
      supportLevel = 'excellent';
    } else if (name === 'firefox' && version >= 85) {
      supportLevel = 'excellent';
    } else if (name === 'safari' && version >= 14) {
      supportLevel = 'excellent';
    } else if (name === 'edge' && version >= 90) {
      supportLevel = 'excellent';
    } else if (version >= minVersion + 10) {
      supportLevel = 'good';
    } else {
      supportLevel = 'limited';
      warnings.push('Your browser version is supported but may have limited features');
      recommendations.push('Consider updating to the latest version for the best experience');
    }
  } else {
    isSupported = false;
    supportLevel = 'unsupported';
    warnings.push(`${name} ${version} is not supported for video consultations`);
    
    if (minVersion) {
      recommendations.push(`Please update to ${name} ${minVersion} or later`);
    } else {
      recommendations.push('Please use Chrome 72+, Firefox 68+, Safari 12.1+, or Edge 79+');
    }
  }

  // Additional warnings for specific browsers
  if (name === 'safari' && version < 14) {
    warnings.push('Safari versions below 14 may have audio/video issues');
  }
  
  if (name === 'firefox' && version < 80) {
    warnings.push('Firefox versions below 80 may have screen sharing limitations');
  }

  return {
    name,
    version,
    isSupported,
    supportLevel,
    warnings,
    recommendations
  };
}

/**
 * Check WebRTC support
 */
export function checkWebRTCSupport(): boolean {
  return !!(
    window.RTCPeerConnection ||
    (window as any).webkitRTCPeerConnection ||
    (window as any).mozRTCPeerConnection
  );
}

/**
 * Check MediaDevices API support
 */
export function checkMediaDevicesSupport(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check getUserMedia support (legacy)
 */
export function checkGetUserMediaSupport(): boolean {
  return !!(
    navigator.mediaDevices?.getUserMedia ||
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
  );
}

/**
 * Check if running in secure context (HTTPS)
 */
export function checkSecureContext(): boolean {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
}

/**
 * Comprehensive system requirements check
 */
export function checkSystemRequirements(): SystemRequirements {
  const browser = detectBrowser();
  const webRTC = checkWebRTCSupport();
  const mediaDevices = checkMediaDevicesSupport();
  const getUserMedia = checkGetUserMediaSupport();
  const isSecureContext = checkSecureContext();
  
  const criticalIssues: string[] = [];
  const warnings: string[] = [...browser.warnings];
  
  // Check for critical issues
  if (!browser.isSupported) {
    criticalIssues.push('Unsupported browser version');
  }
  
  if (!webRTC) {
    criticalIssues.push('WebRTC not supported');
  }
  
  if (!mediaDevices && !getUserMedia) {
    criticalIssues.push('Camera and microphone access not supported');
  }
  
  if (!isSecureContext) {
    criticalIssues.push('Secure connection (HTTPS) required for video calls');
  }
  
  // Add warnings
  if (!mediaDevices && getUserMedia) {
    warnings.push('Using legacy media access API - some features may be limited');
  }
  
  // Determine overall support level
  let overallSupport: SystemRequirements['overallSupport'] = 'excellent';
  
  if (criticalIssues.length > 0) {
    overallSupport = 'unsupported';
  } else if (warnings.length > 2 || browser.supportLevel === 'limited') {
    overallSupport = 'limited';
  } else if (warnings.length > 0 || browser.supportLevel === 'good') {
    overallSupport = 'good';
  }
  
  return {
    browser,
    webRTC,
    mediaDevices,
    getUserMedia,
    isSecureContext,
    overallSupport,
    criticalIssues,
    warnings
  };
}

/**
 * Get user-friendly browser name
 */
export function getBrowserDisplayName(browserName: string): string {
  const displayNames: Record<string, string> = {
    chrome: 'Google Chrome',
    firefox: 'Mozilla Firefox',
    safari: 'Safari',
    edge: 'Microsoft Edge',
    opera: 'Opera',
    unknown: 'Unknown Browser'
  };
  
  return displayNames[browserName] || browserName;
}

/**
 * Get recommended browsers list
 */
export function getRecommendedBrowsers(): Array<{name: string, version: string, downloadUrl: string}> {
  return [
    {
      name: 'Google Chrome',
      version: '72 or later',
      downloadUrl: 'https://www.google.com/chrome/'
    },
    {
      name: 'Mozilla Firefox',
      version: '68 or later',
      downloadUrl: 'https://www.mozilla.org/firefox/'
    },
    {
      name: 'Safari',
      version: '12.1 or later',
      downloadUrl: 'https://www.apple.com/safari/'
    },
    {
      name: 'Microsoft Edge',
      version: '79 or later',
      downloadUrl: 'https://www.microsoft.com/edge'
    }
  ];
}
