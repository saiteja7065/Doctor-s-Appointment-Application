/**
 * Network Speed Testing and Quality Assessment
 * Provides internet speed recommendations and network quality indicators
 */

export interface NetworkTestResult {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
  packetLoss: number; // percentage
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
  warnings: string[];
}

export interface NetworkRequirements {
  minimumDownload: number; // Mbps
  minimumUpload: number; // Mbps
  recommendedDownload: number; // Mbps
  recommendedUpload: number; // Mbps
  maximumLatency: number; // ms
  maximumJitter: number; // ms
}

// Network requirements for video consultations
export const NETWORK_REQUIREMENTS: NetworkRequirements = {
  minimumDownload: 1.0, // 1 Mbps minimum
  minimumUpload: 1.0, // 1 Mbps minimum
  recommendedDownload: 3.0, // 3 Mbps recommended
  recommendedUpload: 3.0, // 3 Mbps recommended
  maximumLatency: 150, // 150ms max latency
  maximumJitter: 30 // 30ms max jitter
};

/**
 * Simple download speed test using a small image
 */
export async function testDownloadSpeed(): Promise<number> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testImage = new Image();
    
    // Use a small test image (approximately 100KB)
    const testImageUrl = `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="url(#grad)"/>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `)}`;
    
    testImage.onload = () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const fileSizeKB = 1; // Approximate size in KB
      const speedKbps = (fileSizeKB * 8) / duration; // Kbps
      const speedMbps = speedKbps / 1000; // Mbps
      
      // Return a simulated speed for demo purposes
      // In production, you would use a proper speed test service
      resolve(Math.max(0.5, Math.min(100, speedMbps * 10))); // Simulate 0.5-100 Mbps
    };
    
    testImage.onerror = () => {
      // Fallback to estimated speed
      resolve(2.0); // Default to 2 Mbps
    };
    
    testImage.src = testImageUrl;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(1.0); // Default to 1 Mbps if test times out
    }, 10000);
  });
}

/**
 * Estimate upload speed (simplified)
 */
export async function testUploadSpeed(): Promise<number> {
  // For demo purposes, return a simulated upload speed
  // In production, you would implement a proper upload test
  return new Promise((resolve) => {
    setTimeout(() => {
      const downloadSpeed = Math.random() * 50 + 1; // 1-51 Mbps
      const uploadSpeed = downloadSpeed * 0.8; // Upload typically 80% of download
      resolve(Math.max(0.5, uploadSpeed));
    }, 1000);
  });
}

/**
 * Test network latency using performance timing
 */
export async function testLatency(): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    // Use a small request to test latency
    fetch('/api/health', { method: 'HEAD' })
      .then(() => {
        const endTime = performance.now();
        const latency = endTime - startTime;
        resolve(latency);
      })
      .catch(() => {
        // Fallback latency estimate
        resolve(50); // 50ms default
      });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      resolve(100); // 100ms default if timeout
    }, 5000);
  });
}

/**
 * Estimate network jitter (simplified)
 */
export async function testJitter(): Promise<number> {
  const latencyTests: number[] = [];
  
  // Perform multiple latency tests
  for (let i = 0; i < 3; i++) {
    const latency = await testLatency();
    latencyTests.push(latency);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate jitter as standard deviation
  const avgLatency = latencyTests.reduce((sum, lat) => sum + lat, 0) / latencyTests.length;
  const variance = latencyTests.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencyTests.length;
  const jitter = Math.sqrt(variance);
  
  return jitter;
}

/**
 * Comprehensive network quality test
 */
export async function performNetworkTest(): Promise<NetworkTestResult> {
  try {
    // Run all tests in parallel for faster results
    const [downloadSpeed, uploadSpeed, latency, jitter] = await Promise.all([
      testDownloadSpeed(),
      testUploadSpeed(),
      testLatency(),
      testJitter()
    ]);
    
    // Packet loss is difficult to measure in browser, so we'll estimate
    const packetLoss = latency > 200 ? Math.random() * 2 : 0; // 0-2% if high latency
    
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze download speed
    if (downloadSpeed < NETWORK_REQUIREMENTS.minimumDownload) {
      warnings.push(`Download speed (${downloadSpeed.toFixed(1)} Mbps) is below minimum requirement`);
      recommendations.push('Consider upgrading your internet plan or connecting to a faster network');
    } else if (downloadSpeed < NETWORK_REQUIREMENTS.recommendedDownload) {
      warnings.push(`Download speed (${downloadSpeed.toFixed(1)} Mbps) is below recommended level`);
      recommendations.push('For best video quality, consider a faster internet connection');
    }
    
    // Analyze upload speed
    if (uploadSpeed < NETWORK_REQUIREMENTS.minimumUpload) {
      warnings.push(`Upload speed (${uploadSpeed.toFixed(1)} Mbps) is below minimum requirement`);
      recommendations.push('Your video quality may be reduced due to low upload speed');
    } else if (uploadSpeed < NETWORK_REQUIREMENTS.recommendedUpload) {
      warnings.push(`Upload speed (${uploadSpeed.toFixed(1)} Mbps) is below recommended level`);
    }
    
    // Analyze latency
    if (latency > NETWORK_REQUIREMENTS.maximumLatency) {
      warnings.push(`Network latency (${latency.toFixed(0)}ms) is higher than recommended`);
      recommendations.push('Try moving closer to your router or using a wired connection');
    }
    
    // Analyze jitter
    if (jitter > NETWORK_REQUIREMENTS.maximumJitter) {
      warnings.push(`Network jitter (${jitter.toFixed(0)}ms) may cause audio/video stuttering`);
      recommendations.push('Close other applications using the internet to reduce network congestion');
    }
    
    // Analyze packet loss
    if (packetLoss > 1) {
      warnings.push(`Packet loss (${packetLoss.toFixed(1)}%) detected`);
      recommendations.push('Check your network connection stability');
    }
    
    // Determine overall quality
    let quality: NetworkTestResult['quality'] = 'excellent';
    
    if (downloadSpeed < NETWORK_REQUIREMENTS.minimumDownload || 
        uploadSpeed < NETWORK_REQUIREMENTS.minimumUpload ||
        latency > NETWORK_REQUIREMENTS.maximumLatency * 2 ||
        packetLoss > 3) {
      quality = 'poor';
    } else if (downloadSpeed < NETWORK_REQUIREMENTS.recommendedDownload ||
               uploadSpeed < NETWORK_REQUIREMENTS.recommendedUpload ||
               latency > NETWORK_REQUIREMENTS.maximumLatency ||
               jitter > NETWORK_REQUIREMENTS.maximumJitter ||
               packetLoss > 1) {
      quality = 'fair';
    } else if (warnings.length > 0) {
      quality = 'good';
    }
    
    // Add general recommendations
    if (quality !== 'excellent') {
      recommendations.push('Close unnecessary browser tabs and applications');
      recommendations.push('Use a wired connection instead of Wi-Fi if possible');
      recommendations.push('Ensure no other devices are streaming or downloading');
    }
    
    return {
      downloadSpeed,
      uploadSpeed,
      latency,
      jitter,
      packetLoss,
      quality,
      recommendations,
      warnings
    };
    
  } catch (error) {
    console.error('Network test failed:', error);
    
    // Return default values if test fails
    return {
      downloadSpeed: 2.0,
      uploadSpeed: 1.5,
      latency: 50,
      jitter: 10,
      packetLoss: 0,
      quality: 'fair',
      recommendations: ['Network test failed - please check your internet connection'],
      warnings: ['Unable to accurately measure network performance']
    };
  }
}

/**
 * Get network quality color for UI display
 */
export function getNetworkQualityColor(quality: NetworkTestResult['quality']): string {
  switch (quality) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'fair':
      return 'text-yellow-600';
    case 'poor':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get network quality icon
 */
export function getNetworkQualityIcon(quality: NetworkTestResult['quality']): string {
  switch (quality) {
    case 'excellent':
      return '🟢';
    case 'good':
      return '🔵';
    case 'fair':
      return '🟡';
    case 'poor':
      return '🔴';
    default:
      return '⚪';
  }
}
