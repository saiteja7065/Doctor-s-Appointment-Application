import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { DoctorApplication, DocumentType } from '@/lib/models/DoctorApplication';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

/**
 * POST /api/doctors/apply/upload
 * Upload documents for doctor application
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToMongoose();

    // Find the doctor application
    const application = await DoctorApplication.findOne({ clerkId: userId });
    if (!application) {
      return NextResponse.json(
        { 
          error: 'Application not found',
          message: 'Please submit your doctor application first before uploading documents.'
        },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!documentType || !Object.values(DocumentType).includes(documentType as DocumentType)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large',
          message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: 'Only PDF, JPEG, PNG, and WebP files are allowed'
        },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'Invalid file extension',
          message: 'Only .pdf, .jpg, .jpeg, .png, and .webp files are allowed'
        },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'doctor-applications', userId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${documentType}_${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create file URL (in production, this would be a cloud storage URL)
    const fileUrl = `/uploads/doctor-applications/${userId}/${fileName}`;

    // Add document to application
    application.addDocument(
      documentType as DocumentType,
      file.name,
      fileUrl,
      file.size,
      file.type
    );

    await application.save();

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        type: documentType,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        uploadedAt: new Date(),
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to upload document. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors/apply/upload
 * Get uploaded documents for current user's application
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToMongoose();

    const application = await DoctorApplication.findOne({ clerkId: userId });
    if (!application) {
      return NextResponse.json(
        { 
          error: 'Application not found',
          message: 'No doctor application found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: application.uploadedDocuments.map(doc => ({
        type: doc.type,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        mimeType: doc.mimeType,
      }))
    });

  } catch (error) {
    console.error('Error fetching uploaded documents:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch documents. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/doctors/apply/upload
 * Delete an uploaded document
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');
    const fileName = searchParams.get('fileName');

    if (!documentType || !fileName) {
      return NextResponse.json(
        { error: 'Document type and file name are required' },
        { status: 400 }
      );
    }

    await connectToMongoose();

    const application = await DoctorApplication.findOne({ clerkId: userId });
    if (!application) {
      return NextResponse.json(
        { 
          error: 'Application not found',
          message: 'No doctor application found'
        },
        { status: 404 }
      );
    }

    // Find and remove the document
    const documentIndex = application.uploadedDocuments.findIndex(
      doc => doc.type === documentType && doc.fileName === fileName
    );

    if (documentIndex === -1) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Remove document from array
    application.uploadedDocuments.splice(documentIndex, 1);
    await application.save();

    // TODO: In production, also delete the file from cloud storage
    // For now, we'll leave the file on disk for safety

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to delete document. Please try again.'
      },
      { status: 500 }
    );
  }
}
