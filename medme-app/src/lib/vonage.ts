import { Video } from '@vonage/video';

// Vonage configuration
const vonageConfig = {
  apiKey: process.env.VONAGE_API_KEY || '',
  apiSecret: process.env.VONAGE_API_SECRET || '',
  applicationId: process.env.VONAGE_APPLICATION_ID || '',
};

// Initialize Vonage Video client
let videoClient: Video | null = null;

export function getVonageVideoClient(): Video | null {
  if (!vonageConfig.apiKey || !vonageConfig.apiSecret) {
    console.warn('Vonage credentials not configured. Video features will use demo mode.');
    return null;
  }

  if (!videoClient) {
    try {
      videoClient = new Video({
        apiKey: vonageConfig.apiKey,
        apiSecret: vonageConfig.apiSecret,
      });
    } catch (error) {
      console.error('Failed to initialize Vonage Video client:', error);
      return null;
    }
  }

  return videoClient;
}

// Check if we're in demo mode
export function isVonageDemoMode(): boolean {
  return !vonageConfig.apiKey || vonageConfig.apiKey === 'demo_api_key' ||
         !vonageConfig.apiSecret || vonageConfig.apiSecret === 'demo_api_secret';
}

export interface VonageSession {
  sessionId: string;
  token: string;
  meetingLink: string;
}

/**
 * Create a new Vonage video session for an appointment
 */
export async function createVideoSession(appointmentId: string): Promise<VonageSession> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    // Return demo session data when Vonage is not configured or in demo mode
    console.log('Using demo mode for video session');
    const demoSessionId = `demo_session_${appointmentId}_${Date.now()}`;
    return {
      sessionId: demoSessionId,
      token: `demo_token_${appointmentId}_${Date.now()}`,
      meetingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${demoSessionId}`,
    };
  }

  try {
    // Create a new session using the Video API
    const sessionResponse = await client.createSession({
      mediaMode: 'routed', // Use routed mode for better reliability
      archiveMode: 'manual', // Allow manual recording if needed
      location: undefined, // Let Vonage choose the best location
    });

    const sessionId = sessionResponse.sessionId;
    if (!sessionId) {
      throw new Error('Failed to create Vonage session');
    }

    // Generate a default token (we'll generate role-specific tokens in generateSessionToken)
    const defaultToken = client.generateClientToken(sessionId, {
      role: 'publisher',
      data: JSON.stringify({
        role: 'patient',
        appointmentId
      }),
      expireTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${sessionId}`;

    console.log(`Created Vonage session: ${sessionId} for appointment: ${appointmentId}`);

    return {
      sessionId,
      token: defaultToken,
      meetingLink,
    };

  } catch (error) {
    console.error('Error creating Vonage session:', error);

    // Fallback to demo session
    const demoSessionId = `demo_session_${appointmentId}_${Date.now()}`;
    return {
      sessionId: demoSessionId,
      token: `demo_token_${appointmentId}_${Date.now()}`,
      meetingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${demoSessionId}`,
    };
  }
}

/**
 * Generate a token for an existing session
 */
export async function generateSessionToken(
  sessionId: string,
  role: 'patient' | 'doctor',
  appointmentId: string
): Promise<string> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    // Return demo token when Vonage is not configured or in demo mode
    return `demo_token_${role}_${appointmentId}_${Date.now()}`;
  }

  try {
    const token = client.generateClientToken(sessionId, {
      role: 'publisher', // Both patients and doctors can publish and subscribe
      data: JSON.stringify({
        role,
        appointmentId
      }),
      expireTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    console.log(`Generated token for ${role} in session: ${sessionId}`);
    return token;

  } catch (error) {
    console.error('Error generating Vonage token:', error);
    return `demo_token_${role}_${appointmentId}_${Date.now()}`;
  }
}

/**
 * Archive (record) a session
 */
export async function startArchive(sessionId: string, name?: string): Promise<string | null> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    console.warn('Vonage client not available for archiving (demo mode)');
    return `demo_archive_${sessionId}_${Date.now()}`;
  }

  try {
    const archive = await client.startArchive(sessionId, {
      name: name || `consultation_${sessionId}_${Date.now()}`,
      outputMode: 'composed',
      resolution: '1280x720',
    });

    console.log(`Started archive: ${archive.id} for session: ${sessionId}`);
    return archive.id;
  } catch (error) {
    console.error('Error starting archive:', error);
    return null;
  }
}

/**
 * Stop archiving a session
 */
export async function stopArchive(archiveId: string): Promise<boolean> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    console.log('Demo mode: Archive stopped successfully');
    return true;
  }

  try {
    await client.stopArchive(archiveId);
    console.log(`Stopped archive: ${archiveId}`);
    return true;
  } catch (error) {
    console.error('Error stopping archive:', error);
    return false;
  }
}

/**
 * Get session information
 */
export async function getSessionInfo(sessionId: string): Promise<any> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    return {
      sessionId,
      status: 'demo',
      connectionCount: 0,
    };
  }

  try {
    // Note: The Video API doesn't have a direct getSession method
    // This would typically require storing session state in your database
    return {
      sessionId,
      status: 'active',
      connectionCount: 0,
    };
  } catch (error) {
    console.error('Error getting session info:', error);
    return {
      sessionId,
      status: 'error',
      connectionCount: 0,
    };
  }
}

/**
 * Get session information for an appointment
 */
export async function getAppointmentSessionInfo(sessionId: string): Promise<{
  sessionId: string;
  isActive: boolean;
  connectionCount: number;
} | null> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    // Return demo session info
    return {
      sessionId,
      isActive: true,
      connectionCount: 0,
    };
  }

  try {
    // Note: Vonage doesn't provide a direct way to get session info
    // This would typically require storing session state in your database
    // For now, we'll return basic info
    return {
      sessionId,
      isActive: true,
      connectionCount: 0,
    };

  } catch (error) {
    console.error('Error getting session info:', error);
    return null;
  }
}

/**
 * End a video session
 */
export async function endVideoSession(sessionId: string): Promise<boolean> {
  const client = getVonageVideoClient();

  if (!client || isVonageDemoMode()) {
    console.log('Demo mode: Session ended successfully');
    return true;
  }

  try {
    // Note: Vonage sessions don't need to be explicitly ended
    // They expire automatically based on the configured timeout
    // This function is here for future extensibility
    console.log(`Session ${sessionId} marked for cleanup`);
    return true;

  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

/**
 * Validate Vonage configuration
 */
export function validateVonageConfig(): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!vonageConfig.apiKey) missingFields.push('VONAGE_API_KEY');
  if (!vonageConfig.apiSecret) missingFields.push('VONAGE_API_SECRET');
  if (!vonageConfig.applicationId) missingFields.push('VONAGE_APPLICATION_ID');
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export default {
  createVideoSession,
  generateSessionToken,
  getSessionInfo,
  endVideoSession,
  validateVonageConfig,
  getVonageVideoClient,
  isVonageDemoMode,
  startArchive,
  stopArchive,
  getAppointmentSessionInfo,
};
