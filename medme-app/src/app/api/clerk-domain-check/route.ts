import { NextRequest, NextResponse } from 'next/server';

/**
 * Decode Clerk Domain from Publishable Key
 * This helps identify what domain your Clerk app is configured for
 */
export async function GET(request: NextRequest) {
  try {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      return NextResponse.json({
        status: 'error',
        message: 'No Clerk publishable key found',
      }, { status: 400 });
    }

    // Decode the domain from the publishable key
    let clerkDomain = 'unknown';
    let keyAnalysis = {};
    
    try {
      // Clerk publishable keys format: pk_test_[base64_encoded_domain]
      const keyParts = publishableKey.split('_');
      
      if (keyParts.length >= 3) {
        const encodedPart = keyParts[2];
        
        try {
          // Try to decode as base64
          clerkDomain = Buffer.from(encodedPart, 'base64').toString('utf-8');
        } catch (decodeError) {
          // If base64 decode fails, it might be a different encoding
          clerkDomain = 'decode_failed';
        }
        
        keyAnalysis = {
          keyPrefix: keyParts[0],
          environment: keyParts[1],
          encodedPart: encodedPart,
          decodedDomain: clerkDomain,
          keyLength: publishableKey.length,
        };
      }
    } catch (error) {
      console.error('Error decoding Clerk key:', error);
    }

    // Get current request info
    const currentHost = request.headers.get('host') || 'unknown';
    const currentUrl = request.url;
    
    // Check for domain mismatch
    const domainMatch = currentHost === clerkDomain;
    
    return NextResponse.json({
      status: 'success',
      analysis: {
        currentHost,
        currentUrl,
        clerkDomain,
        domainMatch,
        keyAnalysis,
        recommendations: domainMatch ? 
          ['✅ Domain configuration looks correct'] : 
          [
            `❌ Domain mismatch detected`,
            `Current host: ${currentHost}`,
            `Clerk configured for: ${clerkDomain}`,
            ``,
            `🔧 Solutions:`,
            `1. Go to https://dashboard.clerk.com/`,
            `2. Select your app`,
            `3. Go to Settings → Domains`,
            `4. Add domain: ${currentHost}`,
            `5. Save changes`,
            ``,
            `Or create a new Clerk app for ${currentHost}`
          ]
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Clerk domain check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Clerk domain configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
