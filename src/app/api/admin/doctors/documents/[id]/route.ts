import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorApplication } from '@/lib/models/DoctorApplication';
import { withAdminAuth } from '@/lib/auth/rbac';
import { logUserManagementEvent, AuditAction } from '@/lib/audit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET /api/admin/doctors/documents/[id] - Download/view document
async function getDocumentHandler(
  userContext: any,
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    const documentId = params.id;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const action = searchParams.get('action') || 'view'; // 'view' or 'download'

    if (!documentId || !applicationId) {
      return NextResponse.json(
        { error: 'Document ID and Application ID are required' },
        { status: 400 }
      );
    }

    const isConnected = await connectToDatabase();
    
    if (!isConnected) {
      // Demo mode - return demo document info
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          type: 'medical_license',
          fileName: 'medical_license_demo.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          uploadedAt: '2024-01-15T10:00:00Z',
          downloadUrl: `/demo/documents/${documentId}`,
          viewUrl: `/demo/documents/${documentId}?view=true`
        },
        message: 'Document information retrieved (demo mode)'
      });
    }

    // Find the application and document
    const application = await DoctorApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const document = application.uploadedDocuments.find(
      doc => doc._id?.toString() === documentId
    );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if file exists on disk
    const filePath = join(process.cwd(), 'uploads', document.fileUrl.replace('/uploads/', ''));
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Document file not found on server' },
        { status: 404 }
      );
    }

    // Log document access
    await logUserManagementEvent(
      AuditAction.DOCUMENT_ACCESS,
      userId!,
      applicationId,
      `Admin accessed document: ${document.fileName}`,
      request,
      undefined,
      {
        documentId,
        documentType: document.type,
        fileName: document.fileName,
        action
      }
    );

    if (action === 'download') {
      // Return file for download
      const fileBuffer = await readFile(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `attachment; filename="${document.fileName}"`,
          'Content-Length': document.fileSize.toString()
        }
      });
    } else {
      // Return document info for viewing
      return NextResponse.json({
        success: true,
        document: {
          id: document._id?.toString(),
          type: document.type,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          uploadedAt: document.uploadedAt.toISOString(),
          downloadUrl: `/api/admin/doctors/documents/${documentId}?applicationId=${applicationId}&action=download`,
          viewUrl: document.fileUrl
        },
        message: 'Document information retrieved successfully'
      });
    }

  } catch (error) {
    console.error('Error handling document request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/doctors/documents/[id] - Verify/flag document
async function verifyDocumentHandler(
  userContext: any,
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    const documentId = params.id;
    const body = await request.json();
    const { applicationId, verified, flagged, comments } = body;

    if (!documentId || !applicationId) {
      return NextResponse.json(
        { error: 'Document ID and Application ID are required' },
        { status: 400 }
      );
    }

    const isConnected = await connectToDatabase();
    
    if (!isConnected) {
      // Demo mode response
      return NextResponse.json({
        success: true,
        message: `Document ${verified ? 'verified' : flagged ? 'flagged' : 'updated'} successfully (demo mode)`,
        documentId,
        verified: verified || false,
        flagged: flagged || false,
        comments: comments || '',
        verifiedBy: userId,
        verifiedAt: new Date().toISOString()
      });
    }

    // Find the application and document
    const application = await DoctorApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const documentIndex = application.uploadedDocuments.findIndex(
      doc => doc._id?.toString() === documentId
    );

    if (documentIndex === -1) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update document verification status
    const document = application.uploadedDocuments[documentIndex];
    document.verified = verified || false;
    document.flagged = flagged || false;
    document.verificationComments = comments || '';
    document.verifiedBy = userId;
    document.verifiedAt = new Date();

    await application.save();

    // Log document verification
    await logUserManagementEvent(
      AuditAction.DOCUMENT_VERIFICATION,
      userId!,
      applicationId,
      `Document ${document.fileName} ${verified ? 'verified' : flagged ? 'flagged' : 'updated'} by admin`,
      request,
      undefined,
      {
        documentId,
        documentType: document.type,
        fileName: document.fileName,
        verified: verified || false,
        flagged: flagged || false,
        comments: comments || ''
      }
    );

    return NextResponse.json({
      success: true,
      message: `Document ${verified ? 'verified' : flagged ? 'flagged' : 'updated'} successfully`,
      documentId,
      verified: verified || false,
      flagged: flagged || false,
      comments: comments || '',
      verifiedBy: userId,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getDocumentHandler);
export const POST = withAdminAuth(verifyDocumentHandler);
