/**
 * @jest-environment node
 */
import { GET } from '@/app/api/doctors/search/route';

// Mock dependencies
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock('@/lib/models/Doctor', () => ({
  Doctor: {
    aggregate: jest.fn(),
    distinct: jest.fn(),
  },
  MedicalSpecialty: {
    CARDIOLOGY: 'cardiology',
    DERMATOLOGY: 'dermatology',
    GENERAL_PRACTICE: 'general_practice',
    PEDIATRICS: 'pediatrics',
    NEUROLOGY: 'neurology',
    ONCOLOGY: 'oncology',
    PSYCHIATRY: 'psychiatry',
    ORTHOPEDICS: 'orthopedics',
    GYNECOLOGY: 'gynecology',
    ENDOCRINOLOGY: 'endocrinology',
    GASTROENTEROLOGY: 'gastroenterology',
    PULMONOLOGY: 'pulmonology',
    RHEUMATOLOGY: 'rheumatology',
    UROLOGY: 'urology',
    OPHTHALMOLOGY: 'ophthalmology',
    ENT: 'ent',
    RADIOLOGY: 'radiology',
    ANESTHESIOLOGY: 'anesthesiology',
    EMERGENCY_MEDICINE: 'emergency_medicine',
    FAMILY_MEDICINE: 'family_medicine',
  },
  DoctorVerificationStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  },
}));

const { connectToDatabase } = require('@/lib/mongodb');
const { Doctor } = require('@/lib/models/Doctor');

describe('/api/doctors/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/doctors/search', () => {
    it('should return demo data when database is not connected', async () => {
      // Mock database connection failure
      connectToDatabase.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors).toBeDefined();
      expect(Array.isArray(data.doctors)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.filters).toBeDefined();
    });

    it('should return filtered doctors when database is connected', async () => {
      // Mock database connection success
      connectToDatabase.mockResolvedValue(true);

      // Mock aggregation pipeline results
      const mockDoctors = [
        {
          _id: 'doctor1',
          fullName: 'Dr. John Doe',
          user: { firstName: 'John', lastName: 'Doe' },
          specialty: 'CARDIOLOGY',
          averageRating: 4.5,
          totalRatings: 100,
          yearsOfExperience: 10,
          consultationFee: 3,
          totalConsultations: 200,
          bio: 'Experienced cardiologist',
          languages: ['English'],
          isOnline: true,
          verificationStatus: 'approved',
          education: [],
          certifications: [],
        },
      ];

      const mockCountResult = [{ total: 1 }];

      Doctor.aggregate
        .mockResolvedValueOnce(mockCountResult) // For count pipeline
        .mockResolvedValueOnce(mockDoctors); // For main pipeline

      Doctor.distinct
        .mockResolvedValueOnce(['CARDIOLOGY', 'DERMATOLOGY']) // specialties
        .mockResolvedValueOnce(['English', 'Spanish']); // languages

      const request = new Request('http://localhost:3000/api/doctors/search?specialty=CARDIOLOGY');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors).toHaveLength(1);
      expect(data.doctors[0].name).toBe('Dr. John Doe');
      expect(data.pagination.total).toBe(1);
    });

    it('should handle search query parameter', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?search=cardiology');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle rating filter', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?minRating=4.0');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle fee filter', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?maxFee=5');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle experience filter', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?experience=5');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle languages filter', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?languages=English,Spanish');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle sorting parameters', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?sortBy=experience&sortOrder=asc');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(Doctor.aggregate).toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate
        .mockResolvedValueOnce([{ total: 25 }])
        .mockResolvedValueOnce([]);
      Doctor.distinct
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/doctors/search?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      connectToDatabase.mockResolvedValue(true);
      Doctor.aggregate.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to search doctors');
    });

    it('should return correct demo data structure', async () => {
      connectToDatabase.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(data.doctors[0]).toHaveProperty('id');
      expect(data.doctors[0]).toHaveProperty('name');
      expect(data.doctors[0]).toHaveProperty('specialty');
      expect(data.doctors[0]).toHaveProperty('formattedSpecialty');
      expect(data.doctors[0]).toHaveProperty('rating');
      expect(data.doctors[0]).toHaveProperty('totalRatings');
      expect(data.doctors[0]).toHaveProperty('experience');
      expect(data.doctors[0]).toHaveProperty('consultationFee');
      expect(data.doctors[0]).toHaveProperty('languages');
      expect(data.doctors[0]).toHaveProperty('education');
      expect(data.doctors[0]).toHaveProperty('certifications');
    });
  });
});
