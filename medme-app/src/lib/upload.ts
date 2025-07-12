import { NextRequest } from 'next/server';

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg', 
    'image/png': '.png',
  },
  uploadDir: 'uploads/credentials',
};

// File upload validation
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB limit`,
    };
  }

  // Check file type
  if (!UPLOAD_CONFIG.allowedTypes[file.type as keyof typeof UPLOAD_CONFIG.allowedTypes]) {
    return {
      isValid: false,
      error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed',
    };
  }

  // Get file extension
  const extension = UPLOAD_CONFIG.allowedTypes[file.type as keyof typeof UPLOAD_CONFIG.allowedTypes];

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

// Generate secure filename
export function generateSecureFilename(originalName: string, userId: string, type: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  
  return `${userId}_${type}_${timestamp}_${randomString}.${extension}`;
}

// File upload service for development (stores files locally)
export class FileUploadService {
  private static instance: FileUploadService;

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  // Upload file (demo implementation - in production, use cloud storage like AWS S3, Cloudinary, etc.)
  async uploadFile(file: File, userId: string, type: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Generate secure filename
      const secureFilename = generateSecureFilename(file.name, userId, type);
      
      // In development mode, we'll simulate file upload and return a demo URL
      // In production, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
      const demoUrl = `/uploads/credentials/${secureFilename}`;
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`File uploaded successfully: ${file.name} -> ${demoUrl}`);
      
      return {
        success: true,
        url: demoUrl,
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: 'Failed to upload file. Please try again.',
      };
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files: File[], userId: string, type: string): Promise<{
    success: boolean;
    urls?: string[];
    errors?: string[];
  }> {
    const results = await Promise.all(
      files.map(file => this.uploadFile(file, userId, type))
    );

    const successfulUploads = results.filter(result => result.success);
    const failedUploads = results.filter(result => !result.success);

    if (failedUploads.length > 0) {
      return {
        success: false,
        errors: failedUploads.map(result => result.error || 'Unknown error'),
      };
    }

    return {
      success: true,
      urls: successfulUploads.map(result => result.url!),
    };
  }

  // Delete file (for cleanup)
  async deleteFile(url: string): Promise<boolean> {
    try {
      // In production, implement actual file deletion from cloud storage
      console.log(`File deleted: ${url}`);
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }
}

// Helper function to convert File to base64 (for demo purposes)
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// File upload API endpoint helper
export async function handleFileUploadRequest(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    if (!type) {
      return {
        success: false,
        error: 'File type not specified',
      };
    }

    const uploadService = FileUploadService.getInstance();
    return await uploadService.uploadFile(file, userId, type);
  } catch (error) {
    console.error('File upload request error:', error);
    return {
      success: false,
      error: 'Failed to process file upload request',
    };
  }
}

export default FileUploadService;
