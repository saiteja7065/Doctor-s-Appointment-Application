import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/doctors/apply/route.fixed';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  connectToMongoose: jest.fn(),
}));

jest.mock('@/lib/models/User', () => ({
  UserRole: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
  },
  User: {
    findOne: jest.fn(),
    find: jest.fn(),
  }
}));

jest.mock('@/lib/models/DoctorApplication', () => ({
  DoctorApplication: jest.fn().mockImplementation(function(data) {
    this._id = 'doctor-id';
    this.status = 'pending';
    this.save = jest.fn().mockResolvedValue(this);
    Object.assign(this, data);
  }),
  ApplicationStatus: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  findOne: jest.fn(),
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn(),
  NotificationType: {
    DOCTOR_APPLICATION_SUBMITTED: 'doctor_application_submitted',
  },
  NotificationPriority: {
    HIGH: 'high',
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logUserManagementEvent: jest.fn(),
}));

jest.mock('@/lib/demo-auth', () => ({
  DemoAuthService: {
    isDemoMode: jest.fn().mockReturnValue(false),
  },
}));

describe('/api/doctors/apply', () => {
  const mockAuth = require('@clerk/nextjs/server').auth;
  const mockConnectToMongoose = require('@/lib/mongodb').connectToMongoose;
  const mockUser = require('@/lib/models/User').User;
  const mockDoctorApplication = require('@/lib/models/DoctorApplication');
  const mockDemoAuthService = require('@/lib/demo-auth').DemoAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/doctors/apply', () => {
    const validApplicationData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phoneNumber: "1234567890",
      specialty: "general_practice",
      licenseNumber: "MD123456",
      credentialUrl: "https://example.com/credentials.pdf",
      yearsOfExperience: 5,
      education: [{
        degree: "MD",
        institution: "Harvard Medical School",
        graduationYear: 2015
      }],
      languages: ["English"],
      consultationFee: 3
    };

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing required fields', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });

      const incompleteData = {
        specialty: 'general_practice',
        // Missing other required fields
      };

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return demo response when database is not available', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('demo mode');
      expect(data.applicationId).toContain('demo_');
      expect(data.status).toBe('pending');
      expect(data.estimatedReviewTime).toBe('2-5 business days');
    });

    it('should return 404 if user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(true);
      mockUser.findOne.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 409 if doctor application already exists', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(true);
      mockUser.findOne.mockResolvedValue({ _id: 'user-id' });
      mockDoctorApplication.findOne.mockResolvedValue({ _id: 'doctor-id', status: 'pending' });

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Doctor application already exists');
    });

    it('should create doctor application successfully', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(true);
      mockUser.findOne.mockResolvedValue({ _id: 'user-id', role: 'patient' });
      mockDoctorApplication.findOne.mockResolvedValue(null);
      mockUser.find.mockResolvedValue([]); // No admins to notify

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Doctor application submitted successfully');
      expect(data.applicationId).toBe('doctor-id');
      expect(data.status).toBe('pending');
    });

    it('should handle demo mode correctly', async () => {
      mockDemoAuthService.isDemoMode.mockReturnValue(true);
      
      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('demo mode');
      expect(data.applicationId).toContain('demo_app_');
      expect(data.isDemo).toBe(true);
    });
  });

  describe('GET /api/doctors/apply', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 503 when database is not available', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Database not available');
    });

    it('should return 404 if no application found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(true);
      mockDoctorApplication.findOne.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No application found');
    });

    it('should return application status successfully', async () => {
      const mockApplication = {
        _id: 'doctor-id',
        status: 'pending',
        specialty: 'general_practice',
        submittedAt: new Date(),
        updatedAt: new Date(),
        adminReviews: []
      };

      mockAuth.mockResolvedValue({ userId: 'test-user-id' });
      mockConnectToMongoose.mockResolvedValue(true);
      mockDoctorApplication.findOne.mockResolvedValue(mockApplication);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.applicationId).toBe('doctor-id');
      expect(data.status).toBe('pending');
      expect(data.specialty).toBe('general_practice');
      expect(data.submittedAt).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });
  });
});