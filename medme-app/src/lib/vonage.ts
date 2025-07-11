// Vonage configuration
const vonageConfig = {
  apiKey: process.env.VONAGE_API_KEY || '',
  apiSecret: process.env.VONAGE_API_SECRET || '',
  applicationId: process.env.VONAGE_APPLICATION_ID || '',
};

// For demo purposes, we'll use a simplified approach
// In production, you would use the actual Vonage SDK
export function getVonageClient() {
  if (!vonageConfig.apiKey || !vonageConfig.apiSecret) {
    console.warn('Vonage credentials not configured. Video features will use demo mode.');
    return null;
  }

  // Return a mock client for demo purposes
  // In production, initialize the actual Vonage client here
  return {
    video: {
      createSession: async (options: any) => {
        // Mock session creation
        return {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      },
      generateToken: (sessionId: string, options: any) => {
        // Mock token generation
        return `token_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }
  };
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
  const client = getVonageClient();
  
  if (!client) {
    // Return demo session data when Vonage is not configured
    const demoSessionId = `demo_session_${appointmentId}_${Date.now()}`;
    return {
      sessionId: demoSessionId,
      token: `demo_token_${appointmentId}_${Date.now()}`,
      meetingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${demoSessionId}`,
    };
  }

  try {
    // Create a new session
    const session = await client.video.createSession({
      mediaMode: 'routed', // Use routed mode for better reliability
      archiveMode: 'manual', // Allow manual recording if needed
    });

    if (!session.sessionId) {
      throw new Error('Failed to create Vonage session');
    }

    // Generate tokens for the session
    const patientToken = client.video.generateToken(session.sessionId, {
      role: 'publisher', // Can publish and subscribe
      data: JSON.stringify({
        role: 'patient',
        appointmentId
      }),
      expireTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    const doctorToken = client.video.generateToken(session.sessionId, {
      role: 'publisher', // Can publish and subscribe
      data: JSON.stringify({
        role: 'doctor',
        appointmentId
      }),
      expireTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    // For now, we'll use the patient token as the default
    // In a real implementation, you'd store both tokens and provide them based on user role
    const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/${session.sessionId}`;

    return {
      sessionId: session.sessionId,
      token: patientToken,
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
  const client = getVonageClient();
  
  if (!client) {
    // Return demo token when Vonage is not configured
    return `demo_token_${role}_${appointmentId}_${Date.now()}`;
  }

  try {
    const token = client.video.generateToken(sessionId, {
      role: 'publisher',
      data: JSON.stringify({
        role,
        appointmentId
      }),
      expireTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    return token;

  } catch (error) {
    console.error('Error generating Vonage token:', error);
    return `demo_token_${role}_${appointmentId}_${Date.now()}`;
  }
}

/**
 * Get session information for an appointment
 */
export async function getSessionInfo(sessionId: string): Promise<{
  sessionId: string;
  isActive: boolean;
  connectionCount: number;
} | null> {
  const client = getVonageClient();
  
  if (!client) {
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
  const client = getVonageClient();
  
  if (!client) {
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
  getVonageClient,
};
