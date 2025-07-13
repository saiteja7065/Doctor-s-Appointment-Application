import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/system-check
 * Provides system requirements and recommendations for video consultations
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return system requirements and recommendations
    const systemRequirements = {
      browser: {
        supported: [
          { name: 'Google Chrome', minVersion: 72, recommended: true },
          { name: 'Mozilla Firefox', minVersion: 68, recommended: true },
          { name: 'Safari', minVersion: 12.1, recommended: true },
          { name: 'Microsoft Edge', minVersion: 79, recommended: true },
          { name: 'Opera', minVersion: 60, recommended: false }
        ],
        features: [
          'WebRTC support',
          'getUserMedia API',
          'MediaDevices API',
          'Secure context (HTTPS)',
          'JavaScript enabled'
        ]
      },
      network: {
        minimum: {
          download: 1.0, // Mbps
          upload: 1.0, // Mbps
          latency: 300 // ms
        },
        recommended: {
          download: 3.0, // Mbps
          upload: 3.0, // Mbps
          latency: 150 // ms
        },
        optimal: {
          download: 5.0, // Mbps
          upload: 5.0, // Mbps
          latency: 100 // ms
        }
      },
      devices: {
        camera: {
          required: true,
          resolution: {
            minimum: '480p',
            recommended: '720p',
            optimal: '1080p'
          }
        },
        microphone: {
          required: true,
          quality: 'Clear audio input without echo or background noise'
        },
        speakers: {
          required: true,
          alternative: 'Headphones recommended to prevent echo'
        }
      },
      environment: {
        lighting: 'Good lighting on your face',
        background: 'Quiet environment with minimal distractions',
        position: 'Camera at eye level for best video quality'
      }
    };

    const troubleshooting = {
      browser: [
        'Update your browser to the latest version',
        'Enable JavaScript and cookies',
        'Disable browser extensions that might interfere',
        'Clear browser cache and cookies',
        'Try using an incognito/private browsing window'
      ],
      network: [
        'Close other applications using internet bandwidth',
        'Move closer to your WiFi router',
        'Use wired connection if possible',
        'Restart your router/modem',
        'Contact your internet service provider if issues persist'
      ],
      devices: [
        'Allow camera and microphone permissions',
        'Check device privacy settings',
        'Close other applications using camera/microphone',
        'Restart your browser',
        'Try using different camera/microphone if available'
      ]
    };

    return NextResponse.json({
      success: true,
      data: {
        requirements: systemRequirements,
        troubleshooting,
        testEndpoints: {
          browser: '/api/system-check/browser',
          network: '/api/system-check/network',
          devices: '/api/system-check/devices'
        }
      }
    });

  } catch (error) {
    console.error('Error in system check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-check
 * Log system check results for analytics and troubleshooting
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      browserInfo, 
      networkResults, 
      deviceResults, 
      overallResult,
      timestamp 
    } = body;

    // In a production environment, you would log this to your analytics system
    console.log('System check completed:', {
      userId,
      timestamp: timestamp || new Date().toISOString(),
      browser: browserInfo,
      network: networkResults,
      devices: deviceResults,
      overall: overallResult
    });

    // You could also store this in your database for analytics
    // await logSystemCheckResult(userId, { browserInfo, networkResults, deviceResults, overallResult });

    return NextResponse.json({
      success: true,
      message: 'System check results logged successfully'
    });

  } catch (error) {
    console.error('Error logging system check results:', error);
    return NextResponse.json(
      { error: 'Failed to log system check results' },
      { status: 500 }
    );
  }
}
