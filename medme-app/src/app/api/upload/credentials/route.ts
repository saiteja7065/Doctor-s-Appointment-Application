import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleFileUploadRequest } from '@/lib/upload';
import { logSecurityEvent } from '@/lib/audit';
import { AuditAction, AuditSeverity } from '@/lib/models/AuditLog';

/**
 * POST /api/upload/credentials
 * Upload credential files for doctor verification
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log security event for file upload attempt
    await logSecurityEvent(
      AuditAction.SECURITY_DATA_ACCESS,
      AuditSeverity.MEDIUM,
      'Credential file upload attempt',
      userId,
      request,
      undefined,
      {
        action: 'file_upload',
        endpoint: '/api/upload/credentials',
      }
    );

    // Handle file upload
    const result = await handleFileUploadRequest(request, userId);

    if (!result.success) {
      // Log failed upload
      await logSecurityEvent(
        AuditAction.SECURITY_PERMISSION_DENIED,
        AuditSeverity.HIGH,
        `File upload failed: ${result.error}`,
        userId,
        request,
        undefined,
        {
          action: 'file_upload_failed',
          error: result.error,
        }
      );

      return NextResponse.json(
        { 
          error: result.error || 'File upload failed',
          success: false 
        },
        { status: 400 }
      );
    }

    // Log successful upload
    await logSecurityEvent(
      AuditAction.SECURITY_DATA_ACCESS,
      AuditSeverity.LOW,
      'Credential file uploaded successfully',
      userId,
      request,
      undefined,
      {
        action: 'file_upload_success',
        fileUrl: result.url,
      }
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Credential upload error:', error);

    // Log system error
    await logSecurityEvent(
      AuditAction.SYSTEM_ERROR,
      AuditSeverity.HIGH,
      `Credential upload system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      request,
      undefined,
      {
        action: 'file_upload_system_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false,
        message: 'Failed to upload file. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload/credentials
 * Get upload configuration and limits
 */
export async function GET() {
  try {
    return NextResponse.json({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxFiles: 5,
      message: 'Upload configuration retrieved successfully',
    });
  } catch (error) {
    console.error('Upload config error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload configuration' },
      { status: 500 }
    );
  }
}
