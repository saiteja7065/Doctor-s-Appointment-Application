/**
 * Media Devices Management for Video Consultations
 * Handles camera and microphone permissions, device detection, and testing
 */

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
  groupId: string;
}

export interface MediaPermissions {
  camera: PermissionState | 'unknown';
  microphone: PermissionState | 'unknown';
  canRequestPermissions: boolean;
}

export interface MediaTestResult {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraPermission: PermissionState | 'unknown';
  microphonePermission: PermissionState | 'unknown';
  cameraDevices: MediaDeviceInfo[];
  microphoneDevices: MediaDeviceInfo[];
  testStream?: MediaStream;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Check current media permissions
 */
export async function checkMediaPermissions(): Promise<MediaPermissions> {
  const permissions: MediaPermissions = {
    camera: 'unknown',
    microphone: 'unknown',
    canRequestPermissions: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  };

  try {
    // Check camera permission
    if ('permissions' in navigator) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        permissions.camera = cameraPermission.state;
      } catch (error) {
        console.warn('Camera permission check failed:', error);
      }

      // Check microphone permission
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissions.microphone = micPermission.state;
      } catch (error) {
        console.warn('Microphone permission check failed:', error);
      }
    }
  } catch (error) {
    console.warn('Permission API not supported:', error);
  }

  return permissions;
}

/**
 * Get available media devices
 */
export async function getMediaDevices(): Promise<{
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}> {
  const cameras: MediaDeviceInfo[] = [];
  const microphones: MediaDeviceInfo[] = [];
  const speakers: MediaDeviceInfo[] = [];

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('Media devices enumeration not supported');
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    
    devices.forEach(device => {
      const deviceInfo: MediaDeviceInfo = {
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as 'videoinput' | 'audioinput' | 'audiooutput',
        groupId: device.groupId
      };

      switch (device.kind) {
        case 'videoinput':
          cameras.push(deviceInfo);
          break;
        case 'audioinput':
          microphones.push(deviceInfo);
          break;
        case 'audiooutput':
          speakers.push(deviceInfo);
          break;
      }
    });
  } catch (error) {
    console.error('Error enumerating media devices:', error);
  }

  return { cameras, microphones, speakers };
}

/**
 * Request media permissions and test devices
 */
export async function requestMediaPermissions(
  video: boolean = true,
  audio: boolean = true
): Promise<MediaTestResult> {
  const result: MediaTestResult = {
    hasCamera: false,
    hasMicrophone: false,
    cameraPermission: 'unknown',
    microphonePermission: 'unknown',
    cameraDevices: [],
    microphoneDevices: [],
    errors: [],
    warnings: [],
    recommendations: []
  };

  try {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      result.errors.push('Camera and microphone access not supported in this browser');
      result.recommendations.push('Please use a modern browser that supports WebRTC');
      return result;
    }

    // Get initial device list (may be limited without permissions)
    const initialDevices = await getMediaDevices();
    
    // Request media stream to get permissions
    const constraints: MediaStreamConstraints = {
      video: video ? { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      } : false,
      audio: audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      result.testStream = stream;

      // Check what we actually got
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      result.hasCamera = videoTracks.length > 0;
      result.hasMicrophone = audioTracks.length > 0;

      if (result.hasCamera) {
        result.cameraPermission = 'granted';
      }
      if (result.hasMicrophone) {
        result.microphonePermission = 'granted';
      }

      // Get updated device list with labels
      const devices = await getMediaDevices();
      result.cameraDevices = devices.cameras;
      result.microphoneDevices = devices.microphones;

      // Validate device quality
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        const settings = videoTrack.getSettings();
        
        if (settings.width && settings.width < 640) {
          result.warnings.push('Camera resolution is lower than recommended (640x480 minimum)');
        }
        if (settings.frameRate && settings.frameRate < 15) {
          result.warnings.push('Camera frame rate is lower than recommended (15 FPS minimum)');
        }
      }

      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        const settings = audioTrack.getSettings();
        
        if (!settings.echoCancellation) {
          result.warnings.push('Echo cancellation is not available - you may experience audio feedback');
        }
        if (!settings.noiseSuppression) {
          result.warnings.push('Noise suppression is not available - background noise may be audible');
        }
      }

    } catch (permissionError: any) {
      console.error('Media permission error:', permissionError);
      
      // Handle specific permission errors
      if (permissionError.name === 'NotAllowedError') {
        result.errors.push('Camera and microphone access was denied');
        result.recommendations.push('Please allow camera and microphone access in your browser settings');
        result.recommendations.push('Look for the camera/microphone icon in your browser\'s address bar');
        result.cameraPermission = 'denied';
        result.microphonePermission = 'denied';
      } else if (permissionError.name === 'NotFoundError') {
        result.errors.push('No camera or microphone found');
        result.recommendations.push('Please connect a camera and microphone to your device');
      } else if (permissionError.name === 'NotReadableError') {
        result.errors.push('Camera or microphone is already in use by another application');
        result.recommendations.push('Please close other applications that might be using your camera or microphone');
      } else if (permissionError.name === 'OverconstrainedError') {
        result.warnings.push('Requested camera/microphone settings are not supported');
        result.recommendations.push('Your device may have limited camera/microphone capabilities');
      } else {
        result.errors.push(`Media access error: ${permissionError.message}`);
        result.recommendations.push('Please check your device settings and try again');
      }
    }

    // Additional device checks
    if (result.cameraDevices.length === 0 && video) {
      result.warnings.push('No camera devices detected');
      result.recommendations.push('Please ensure your camera is connected and working');
    }

    if (result.microphoneDevices.length === 0 && audio) {
      result.warnings.push('No microphone devices detected');
      result.recommendations.push('Please ensure your microphone is connected and working');
    }

    // Check for multiple devices
    if (result.cameraDevices.length > 1) {
      result.recommendations.push('Multiple cameras detected - you can select your preferred camera in the video call');
    }

    if (result.microphoneDevices.length > 1) {
      result.recommendations.push('Multiple microphones detected - you can select your preferred microphone in the video call');
    }

  } catch (error: any) {
    console.error('Media test failed:', error);
    result.errors.push(`Media test failed: ${error.message}`);
    result.recommendations.push('Please refresh the page and try again');
  }

  return result;
}

/**
 * Stop media stream and release resources
 */
export function stopMediaStream(stream: MediaStream): void {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
}

/**
 * Test specific media device
 */
export async function testMediaDevice(
  deviceId: string,
  kind: 'videoinput' | 'audioinput'
): Promise<{ success: boolean; error?: string; stream?: MediaStream }> {
  try {
    const constraints: MediaStreamConstraints = {};
    
    if (kind === 'videoinput') {
      constraints.video = { deviceId: { exact: deviceId } };
    } else {
      constraints.audio = { deviceId: { exact: deviceId } };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    return { success: true, stream };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Failed to access ${kind}: ${error.message}` 
    };
  }
}

/**
 * Get media device troubleshooting tips
 */
export function getMediaTroubleshootingTips(): string[] {
  return [
    'Ensure your camera and microphone are connected and not being used by other applications',
    'Check your browser permissions - look for camera/microphone icons in the address bar',
    'Try refreshing the page and allowing permissions again',
    'Restart your browser if permissions seem stuck',
    'Check your operating system privacy settings for camera and microphone access',
    'Try using a different browser (Chrome, Firefox, Safari, or Edge)',
    'Ensure you\'re using HTTPS - some browsers require secure connections for media access',
    'If using external devices, try unplugging and reconnecting them',
    'Update your browser to the latest version',
    'Restart your computer if hardware issues persist'
  ];
}

/**
 * Format device name for display
 */
export function formatDeviceName(device: MediaDeviceInfo): string {
  if (device.label) {
    return device.label;
  }
  
  // Fallback names for unlabeled devices
  switch (device.kind) {
    case 'videoinput':
      return `Camera ${device.deviceId.slice(0, 8)}`;
    case 'audioinput':
      return `Microphone ${device.deviceId.slice(0, 8)}`;
    case 'audiooutput':
      return `Speaker ${device.deviceId.slice(0, 8)}`;
    default:
      return `Device ${device.deviceId.slice(0, 8)}`;
  }
}
